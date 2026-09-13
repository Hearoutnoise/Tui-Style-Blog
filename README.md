# TUI BLOG

一个 **TUI（终端用户界面）风格**的个人博客。它把文章目录渲染成一个可导航、类似于终端文件管理器的界面，由一套**无框架、解耦的 Web Components**组成。

所有配色取自 `DRACULA.md`（德古拉主题）。全部边框使用直角（`border-radius: 0`）。

## 核心特性

- 主页、文件管理、文章阅读、弹窗、背景均为**独立的 Web Component**（Shadow DOM 自含样式），无构建、无依赖、无框架耦合。
- 左侧**目录树**用直角线字符（`├─` `└─` `│`）连接层级；右侧**文件列表**显示名称 / 大小 / 修改时间。
- **鼠标 + 键盘**均可导航：方向键、Enter、Backspace、Esc。
- 文章以 **Markdown** 存放于 `content/`，子文件夹 = 目录，`.md` = 文件，**结构即文件系统树**。
- **懒加载**：索引只含树结构与元数据，正文在打开时才 `fetch` 并按需渲染。
- **任意图片 → ASCII 艺术**：构建期自动把源图转成 ASCII，用于主页艺术字与图片框。
- **扫描溶解过渡**：视图切换 / 打开文章时播放 ASCII 扫描消解效果。
- **泛用弹窗**：打开时把整页转成 ASCII 并涟漪扩散。

## 技术亮点

- **图片 → ASCII 管线**：构建期用 jimp 读图，降采样成字符网格，按亮度映射字符密度（越亮越密），把任意图片转成可主题化的 ASCII 艺术。
- **动态 Markdown 内容引擎**：`build.js` 扫描 `content/` 生成索引；正文按需用 `markdown-it` 渲染，含 YAML front-matter 剥离。
- **按需 / 懒加载**：正文与重依赖（html2canvas-pro、markdown-it）在需要时才加载，带 CDN 兜底。
- **模块化组件**：文件管理、阅读、弹窗、背景、扫描特效均为独立可复用的组件或模块，组合时无框架依赖。

## 快速开始

安装构建依赖并生成内容索引与 ASCII 数据：

```bash
npm install
node build.js
```

`--watch` 监听 `content/`、配置与源图变化并自动重建：

```bash
node build.js --watch
```

用任意静态服务器打开 `index.html`：

```bash
python3 -m http.server 8123
# 访问 http://localhost:8123/
```

> 运行时是纯浏览器端，无需服务端；`node` 只在构建期使用。

## 目录结构

| 文件 / 目录 | 说明 |
| --- | --- |
| `index.html` | 页面骨架，含页眉（站点导航）与页脚 |
| `app.js` | 装载器，喂数据并协调主页 → 文件管理 → 文章阅读的切换 |
| `tui-home.js` | 主页组件 |
| `tui-file-manager.js` | 文件管理组件（目录树 + 文件列表） |
| `tui-doc-viewer.js` | 文章阅读组件 |
| `tui-dialog.js` | 泛用弹窗组件 |
| `tui-bg.js` | 共享页面背景组件 |
| `scan-effect.js` | 可复用的 ASCII 扫描过渡模块 |
| `content/` | 文章 Markdown 目录，结构即文件系统树 |
| `site.config.json` | 站点 `meta`（标题、root 等） |
| `build.js` | 构建脚本：扫描 `content/` 生成索引，并把源图转成 ASCII |
| `site.content.js` | 构建生成的索引模块（只含树结构与元数据） |
| `site.home.js` | 构建生成的主页 ASCII 数据 |
| `tools/image-to-ascii.js` | 图像 → ASCII 的纯 JS 转换模块 |
| `assets/home-ascii.jpg` | 主页右侧 ASCII 图源图 |
| `assets/home-smile.jpg` | 主页 `:)` ASCII 艺术字源图 |
| `vendor/` | 本地静态库（html2canvas-pro、markdown-it） |
| `DRACULA.md` | 德古拉配色来源 |

## 内容管理

在 `content/` 里放 `.md`（= 文件）或子文件夹（= 目录），结构即树。每个 `.md` 可用 `---` 包一段 YAML 元数据：

```markdown
---
title: Hello World
date: Aug 31 2026
tags: [intro, meta]
---
正文...
```

- front-matter 字段：`title`、`date`、`modified`、`tags`、`summary`、`href`。
- 有 `href` 的文件打开时转新标签页，不显示正文。
- 文件 `size` 为构建时读取的字节数；目录 `modified` 取其下最新 `.md` 的修改时间。
- 文件名在同一目录内必须唯一。

## 使用组件

```html
<script type="module" src="./tui-file-manager.js"></script>
<tui-file-manager></tui-file-manager>
```

```js
import { fileSystem } from './site.content.js';
const fm = document.querySelector('tui-file-manager');
fm.setFileSystem(fileSystem);
```

### 文件管理 API

| 方法 | 说明 |
| --- | --- |
| `setFileSystem(fs)` | 替换文件系统并重置到根目录 |
| `cd(path)` | 导航到指定路径数组 |
| `setExpanded(path)` | 展开某个目录 |
| `refresh()` | 重新渲染 |
| `playScan(cb)` | 播放一次扫描过渡，完成后回调 |

属性：`scanEnabled`（默认 `true`）、`scanDirection`（`ltr` / `rtl` / `ttb` / `btt`）、`scanDuration`（默认 `520`）、`scanFade`（默认 `160`）、`dblclickMs`（默认 `320`）。

事件：`open`（打开文件时触发，`detail` 含 `{ path, node }`；`node` 含索引字段、不含正文）。

### 键盘

| 按键 | 行为 |
| --- | --- |
| `↑` / `↓` | 移动选中项 |
| `Home` / `End` | 跳到列表首尾 |
| `Enter` / `→` | 进入目录（文件则触发 `open`） |
| `Backspace` / `←` | 返回上级 |
| `Esc` | 关闭文章阅读界面并返回文件管理器 |

> 侧栏目录树**双击**节点才进入目录（单击只展开 / 收起）；文件列表双击同一行等效于 Enter。

## 界面与交互

### 主页
- 四条虚线向四周延伸，与文件管理器边缘对齐。
- 左上 `MY BLOG` 为 figlet 生成的 ASCII 艺术字；右侧为 `:)` 艺术字（粉色边框）与一处 ASCII 艺术图框。
- 黄金分割处有垂直排列的 `HELLO WORLD`（figlet Pegga 风格）艺术字。
- `MY BLOG` 下方为终端日志样式警句：`[时间] INFO "名言" — 作者`，取自 Alan Turing、Edsger W. Dijkstra、Linus Torvalds。
- 底部居中 `个人简介`（打开弹窗）与 `打开文件管理`（进入文件管理器）两个按钮。

### 文章阅读界面
- 打开文件时播放扫描过渡，再把界面交给 `<tui-doc-viewer>`。
- 页眉：紫色标题 + 小字号的 tags / date / modified / name；右上角虚线框 `×` 返回。
- 正文左右对齐两条垂直虚线；关闭时用同一套扫描效果溶解自身。

### 扫描过渡
- 触发时机：**视图切换**（主页 ↔ 文件管理）、打开文件、关闭文章。目录切换**不**播放。
- 方向可配置（`ltr` / `rtl` / `ttb` / `btt`），默认 `ltr`；对 `prefers-reduced-motion` 用户自动跳过。

### 弹窗（tui-dialog）
- 打开时用 html2canvas-pro 快照整页并转 ASCII，从弹窗中心向外涟漪扩散覆盖整页；右上角 `×` 或 `Esc` 关闭，关闭时淡出。

## 配色

取自德古拉主题。左侧目录树的**目录名**为紫色；文件列表的文件类型标签配色如下：

| 类型 | 颜色 |
| --- | --- |
| 目录（DIR） | Cyan |
| 代码 | Green |
| 图片 | Pink |
| 媒体 | Orange |
| 压缩包 | Yellow |
| 可执行 | Red |
| 配置 | Purple |
| 文本 / 文档 | Cyan |
