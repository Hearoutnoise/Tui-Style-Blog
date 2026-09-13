---
title: SSR反射中出现多余命中的原因及解决方法
date: Sep 13 2026
modified: Sep 13 12:00
tags: [unity, urp, ssr, shader]
summary: 从单点深度比较到方案B的「两端采样 + 连续性校验」，记录屏幕空间反射命中检测的三次渐进式改进
---

实现屏幕空间反射（SSR）的核心是**光线步进 + 命中检测**：对每个像素求出反射方向，在世界空间步进光线，判断光线是否命中了场景中的某个表面。

在最开始，我实现的SSR有这样的问题：存在多余的不正确反射，例如，将所有材质的反射都打开，然后在场景中放置一个平面 + 一个立方体，然后将立方体悬浮于地板之上。期望的反射是：几乎完全的镜面反射，地板下方出现一个对称的悬浮方块；然而实际上，不止有这个方块，还有多余的、颜色和方块一样的部分出现；并且调整角度，有时反射甚至会完全消失。

**一条反射光线到底有没有命中表面**这件事，远比看起来复杂。为了定位问题，我不得不先在 shader 里做可视化调试：

| 颜色 | 含义 |
|------|------|
| 红 | 命中并通过校验 |
| 黄 | 命中但被校验拒绝 |
| 蓝 | 光线越出屏幕 |
| 绿 | 光线在表面前方，且前方是天空，安全提前退出 |
| 洋红 | 循环跑完仍未命中 |

------

## 一、原始实现：单点采样

原始的命中检测分为两段：**步进阶段的粗判**，与**二分收敛后的单点校验**。

步进阶段（简化）：

```hlsl
rayPos += rayStep;
hitUV = WorldToScreen(rayPos);
if (hitUV 超出屏幕) break;
float sceneDepth = 采样深度(hitUV);
if (rayDepth > sceneDepth + _Thickness)  { /* 光线越过表面，开始使用二分查找算法 */ }
if (rayDepth < sceneDepth - _Thickness * 10) break;     // ← 问题 1
```

二分收敛后，用**单个采样点**的深度比较来判定真假命中：

```hlsl
float3 finalPos      = (lo + hi) * 0.5;
float3 finalWorld    = ScreenToWorld(hitUV, 采样深度(hitUV));
float  finalRayDepth  = length(finalPos   - _WorldSpaceCameraPos);
float  finalSceneDepth = length(finalWorld - _WorldSpaceCameraPos);
if (abs(finalRayDepth - finalSceneDepth) > _HitThreshold) hit = 0;   // ← 问题 2
```

这套逻辑似乎很完美？但在某些角度下会出现两个典型症状。

### 问题 1：光线提前终止

> 某些角度完全看不到反射，换一个角度又正常。
>

**原因**：提前退出条件 `rayDepth < sceneDepth - _Thickness * 10` 过于激进。反射光线在**贴着地面往走**的时候，会由于_Thickness判定被杀掉，这就导致了在特定角度反射完全消失。

### 问题 2：剪影处的红黄混合带

> 在立方体底面与地面的接触处（并不一定是实际坐标的接触，也可以是屏幕上的接触，即，立方体的像素挨着地面的像素），出现一条红黄像素交织的杂色带。
>

**原因**：校验用的是**单点判定**：

```hlsl
if (abs(finalRayDepth - finalSceneDepth) > _HitThreshold) hit = 0;
```

在某些区域，`hitUV` 正好落在立方体边缘上，往左一个像素落在**物体上**、往右一个像素落在**物体外**。该深度差 `depthDiff` 本身带噪声、且恰好徘徊在 `_HitThreshold` 附近，于是产生红黄噪点般的混合带。

------

## 二、解决方案：修正提前退出

把无条件提前退出改成**只有在前方是天空/最远深度时**才退出：

```hlsl
if (rayDepth < sceneDepth - _Thickness * 10)
{
    // 前方是最远深度（天空）才安全退出；反射天空的像素可省性能
    if (Linear01Depth(sampledDepth, _ZBufferParams) >= 0.999)
        break;
}
```

- **贴地往上、前方是地面/立方体**的光线 → 不再被误杀，继续前进直到命中立方体。
- **真正反射天空**的光线 → 前方是最远深度，照样安全提前退出，不拖性能。

**结果**：完整、正确的反射出现了，角度依赖的失效问题解决。

------

## 三、解决方案：两端采样 + 连续性校验

针对剪影处的红黄混合带，核心思路是：**验证光线确实从表面前方穿越到了表面后方，且这个穿越处的表面是连续的。**

一次**真实命中**必定满足：

1. 二分区间**前端 `lo`**：光线还在表面前方；
2. 二分区间**后端 `hi`**：光线已经到表面后方；
3. 两端采样的**场景深度连续**。

其中第 3 条是识别剪影假命中的关键：`lo` 与 `hi` 只差很小一步、屏幕坐标也很接近。若它们是**同一个平滑表面**，两端场景深度几乎相等；若光线是**跨过物体边缘**（`lo` 落在地面、`hi` 落在立方体），两端场景深度会有一个巨大的落差，说明并非真正打进表面。

实现：

```hlsl
// 在二分区间两端 loUV / hiUV 采样场景深度
float3 surfLo = ScreenToWorld(loUV, 采样深度(loUV));
float3 surfHi = ScreenToWorld(hiUV, 采样深度(hiUV));
float  sceneLoDepth = length(surfLo - _WorldSpaceCameraPos);
float  sceneHiDepth = length(surfHi - _WorldSpaceCameraPos);

// 连续性：两端场景深度不发散（排除剪影处深度跳变）
bool continuous = abs(sceneHiDepth - sceneLoDepth) < _HitThreshold;

// 收敛：光线深度应与场景深度接近（落在表面上）
float3 finalWorld = ScreenToWorld(hitUV, 采样深度(hitUV));
bool depthClose = abs(length(finalPos - _WorldSpaceCameraPos)
                    - length(finalWorld - _WorldSpaceCameraPos)) < _HitThreshold;

if (!continuous || !depthClose)
    hit = 0;    // 假命中
```

**结果**：接触处的红黄混合带消失，剪影假命中被稳定识别。
