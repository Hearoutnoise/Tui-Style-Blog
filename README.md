# TUI File Manager

一个解耦的、tui 风格的目录系统前端组件。它渲染一个类似终端文本界面 (TUI) 的文件管理器，可作为静态站点展示文章。

所有配色取自 `DRACULA.md`，全部边框使用直角 (border-radius 为 0)。

## 特性

- 目录树，使用直角线画字符 (`├─`, `└─`, `│`) 连接层级。
- 双栏文件列表：名称、大小、修改时间。
- 支持鼠标与键盘导航。
- 组件通过 Shadow DOM 自带样式，无构建、无依赖、无框架耦合。
- 内容由 JSON 配置文件驱动，样式固定不变。
- 目录切换时播放扫描消解过渡效果。
- 站点主页为默认视图，由独立的 `<tui-home>` 组件渲染。
- 打开文件节点时触发扫描过渡，然后切换到独立的文章阅读界面；为外部链接则打开新标签页。

## 文件

| 文件 | 说明 |
| ---- | ---- |
| `tui-home.js` | 主页组件源码 (Web Component)，独立解耦 |
| `tui-bg.js` | 共享页面背景组件 (Web Component)，德古拉纯色背景 + 四条分段虚线，可独立复用 |
| `tui-file-manager.js` | 文件管理组件源码 (Web Component)，样式固定 |
| `tui-doc-viewer.js` | 文章阅读组件源码 (Web Component)，独立解耦 |
| `scan-effect.js` | 可复用的 ASCII 扫描过渡模块，供文件管理与阅读组件共用 |
| `site.config.json` | 内容配置文件，你编辑这个文件 |
| `build.js` | 构建脚本，把配置文件转换成数据模块，并把 `assets/home-ascii.jpg` 转成主页 ASCII 艺术字 |
| `site.content.js` | 构建生成的模块，由 `build.js` 产生（文件系统数据） |
| `assets/home-ascii.jpg` | 主页 ASCII 艺术字源图，替换它并重新构建即可换图 |
| `tools/image-to-ascii.js` | 把图像转成 ASCII 的纯 JS 模块，供 `build.js` 调用 |
| `site.home.js` | 构建生成的模块，导出主页 ASCII 数据 (`art` / `cols` / `rows`) |
| `app.js` | 站点装载器，喂数据并协调文件管理到文章阅读的过渡 |
| `index.html` | 页面骨架，含始终可见的站点页眉与页脚 |
| `vendor/html2canvas-pro.esm.js` | 扫描效果用的像素转 canvas 库，本地静态资源 |
| `preview.png` | 文件列表渲染效果 |
| `reader.png` | 文章阅读界面渲染效果 |
| `scan-mid.png` | 扫描过渡效果中途截图 |
| `DRACULA.md` | 配色板 (来源参考) |

## 快速更新内容

修改 `site.config.json`，重新构建，刷新页面。

```bash
node build.js
```

`--watch` 可以监听配置文件变化并自动重建。

```bash
node build.js --watch
```

## 扫描切换效果

触发时机是目录切换。例如双击某个目录、按 Enter、点面包屑、按退格，会先播放一次扫描过渡来消解旧视图，然后显示新目录。

- 按方向把旧视图逐块转换成 ASCII 字符，没有可见的扫描线
- 转换出来的 ASCII 只短暂保留，随后立刻消失
- 扫描完成后显示新目录，带一次淡入

默认从左到右。可配置方向或关闭。

```html
<!-- 扫描方向从右到左 -->
<tui-file-manager scan-direction="rtl"></tui-file-manager>

<!-- 关闭扫描效果 -->
<tui-file-manager no-scan></tui-file-manager>
```

也可通过属性控制：

```js
const fm = document.querySelector('tui-file-manager');
fm.scanEnabled = false;     // 关闭
fm.scanDirection = 'ttb';   // 上到下，可选 ltr rtl ttb btt
fm.scanDuration = 520;      // 扫描时长，毫秒
fm.scanFade = 160;          // ASCII 停留时长，毫秒
fm.dblclickMs = 320;        // 双击判定窗口，毫秒
```

效果依赖 `vendor/html2canvas-pro.esm.js`。组件懒加载它，找不到时回退到 CDN，再失败则直接跳转。对 `prefers-reduced-motion` 用户自动跳过。

## 页面背景组件

德古拉纯色背景 + 四条分段虚线被抽成了独立的 `<tui-bg>` 组件。它是一块纯装饰层，绘制中央矩形（舞台盒）四条边上的虚线，并把虚线延伸至页面边缘。它不拦截任何点击（`pointer-events: none`）。

背景与视图解耦后，扫描过渡在溶解视图时不会再把虚线盖掉：扫描层是透明的，溶解过程中它显示的是视图背后真正的背景（含虚线），而不是覆盖一层纯色。因此播放动画时若正好落在虚线上，虚线也不会消失。

它是主页、文件管理与文章阅读视图共享的页面背景。主页的中央内容、文件管理面板、阅读正文都叠放在这个背景之上，并与虚线框对齐：文件管理器铺满四条虚线围成的中心矩形，阅读界面左右两边对齐两条垂直虚线，虚线向四周延伸。

```html
<script type="module" src="./tui-bg.js"></script>
<tui-bg></tui-bg>
```

## 配置格式

一个配置由 `meta` 与 `tree` 组成。`tree` 是节点数组。

```json
{
  "meta": { "title": "TUI-FS", "root": "~" },
  "tree": [
    {
      "name": "Posts",
      "children": [
        {
          "name": "hello-world.md",
          "title": "Hello World",
          "date": "Aug 31 2026",
          "tags": ["intro"],
          "content": "# Hello World\n\nFirst post."
        }
      ]
    },
    {
      "name": "github.md",
      "title": "GitHub",
      "href": "https://github.com",
      "content": "Opens in a new tab."
    }
  ]
}
```

规则：

- `type` 可省略。有 `children` 视为目录，否则视为文件。
- 文件的 `size` 可省略，默认取 `content` 的字节数。
- 有 `href` 的文件打开时转向新标签页，不显示正文。
- 文件名在同一目录内必须唯一。
- `modified` 可传字符串、时间戳或 `Date`。


## 主页 ASCII 艺术图

主页右侧的 ASCII 艺术框由一张源图在构建时自动转换而来。约定：把图像复制到 `assets/home-ascii.jpg`，然后执行 `node build.js`。首次构建需要 `npm install` 安装 jimp。

转换器 `tools/image-to-ascii.js` 用 jimp 读取图像，降采样成一个字符网格，把亮度映射为字符密度（越亮字符越密）。生成的字符统一用德古拉粉色（与 `:)` 相同）渲染，因此只有密度携带图像信息。结果写入 `site.home.js`，由 `app.js` 通过 `home.setAscii(art, cols, rows)` 喂给 `<tui-home>`。

`<tui-home>` 会用 `ResizeObserver` 把字符网格按包含方式（contain）缩放，居中填入 `.ascii` 方块，不裁切、不变形。

更换源图只需要替换 `assets/home-ascii.jpg` 再构建一次。

```bash
cp 新图.jpg assets/home-ascii.jpg
node build.js
```

## 使用组件

通过 ES Module 引入。

```html
<script type="module" src="./tui-file-manager.js"></script>
<tui-file-manager></tui-file-manager>
```

要使用配置数据，调用 `setFileSystem`。

```js
import { fileSystem } from './site.content.js';
const fm = document.querySelector('tui-file-manager');
fm.setFileSystem(fileSystem);
```

## API

| 方法 | 说明 |
| ---- | ---- |
| `setFileSystem(fs)` | 替换文件系统并重置到根目录 |
| `cd(path)` | 导航到指定路径数组 |
| `setExpanded(path)` | 在目录树中展开某个目录 |
| `refresh()` | 重新渲染 |
| `playScan(cb)` | 播放一次扫描过渡，完成后回调，用于切换到其他界面 |
| `currentPath` | 当前路径的规范字符串，如 `~/Posts` |

属性：

- `scanEnabled`：是否启用扫描过渡，默认 `true`
- `scanDirection`：`ltr` `rtl` `ttb` `btt`，默认 `ltr`
- `scanDuration`：扫描时长毫秒，默认 `520`
- `scanFade`：ASCII 停留时长毫秒，默认 `160`
- `dblclickMs`：双击判定窗口毫秒，默认 `320`

事件：

- `open`：打开一个文件时触发，`detail` 包含 `{ path, node }`。`node` 上带有配置文件里的 `title`、`content`、`href` 等字段。

## 键盘操作

| 按键 | 行为 |
| ---- | ---- |
| `↑` / `↓` | 移动选中项 |
| `Home` / `End` | 跳到文件列表首尾 |
| `Enter` / `→` | 进入选中目录 (文件则触发 `open` 事件) |
| `Backspace` / `←` | 返回上一级目录 |
| `Esc` | 关闭文章阅读界面并返回文件系统 |

目录切换会触发扫描过渡效果。

在文件列表里快速双击同一行，等效于按 Enter。双击判定是组件自己实现的，判定窗口为 `dblclickMs`。这种实现不依赖浏览器的原生双击检测，因此更可靠。

左侧目录树只显示文件夹，文件不出现在树里。单击节点只展开或收起，不会导航。要打开某个目录，请双击该节点，或先选中再按 Enter。

## 主页

站点默认进入主页。主页由独立的 `<tui-home>` 组件渲染，采用德古拉配色：

- 四条分割虚线，恰好是文件管理器四个边缘的延伸。
- 主内容位于中央矩形，围绕黄金分割排版。
- 左上角的 `MY BLOG` 使用 figlet 生成的 ASCII 艺术字（ANSI Shadow 样式），右侧边缘接近 `:)`。
- `:)` 位于中心矩形右侧黄金分割处并带矩形边框。
- `:)` 右侧是一个 ASCII 艺术框，保留矩形边框与半透明背景，里面由构建时从 `assets/home-ascii.jpg` 生成的 ASCII 艺术图填充，颜色与 `:)` 相同。
- 黄金分割线上有垂直排列的 `HELLO WORLD`，颜色与 `:)` 相同。
- `MY BLOG` 下方是警句正文，像文章正文一样往下平铺，其底端与右侧空白占位框下方大致平齐，无左侧竖线。
- 底部操作区居中放置 `个人简介` 与 `打开文件管理` 两个按钮，无箭头、无方块、无 `点击左侧` 标签，`打开文件管理` 无紫色高亮。

页面之间的切换都由 `app.js` 协调，均复用 `scan-effect.js` 的扫描效果。点击主页的 `打开文件管理` 会先播放扫描，再进入文件管理器。

## 文章阅读界面

打开一个文件时，文件管理器先播放扫描过渡，再把界面交给独立的 `<tui-doc-viewer>` 组件展示正文。点击 `×` 或按 `Esc` 返回时，阅读组件会用同一套扫描效果溶解自身，再回到文件系统。

扫描动画被抽成了独立的 `scan-effect.js` 模块，接收任意元素即可播放。文件管理器的目录切换、打开文件的过渡、以及阅读界面的返回过渡，都复用同一个模块，因此与任何具体组件解耦。

```html
<tui-doc-viewer hidden></tui-doc-viewer>
```

监听 `open` 事件，然后调用阅读组件的 `open`：

```js
fm.playScan(() => viewer.open(node));
```

阅读界面布局：

- 左右两侧为垂直实线，与文件管理器的左右边界对齐。
- 顶部页眉，用虚线与正文分隔。
- 页眉左侧：紫色高亮的标题，以及小字号的 tags / date / modified / name（其他颜色）。
- 页眉右上角：虚线矩形内的 `×`，点击返回文件系统。

监听阅读组件的 `close` 事件返回文件系统：

```js
viewer.addEventListener('close', () => fm.focus());
```

阅读组件 API：

| 方法 | 说明 |
| ---- | ---- |
| `open(node)` | 用文件节点填充并显示正文 |
| `close()` | 隐藏并派发 `close` 事件 |

事件：

- `close`：点击 `×` 或按 `Esc` 时触发。

## 类型配色

| 类型 | 颜色来源 |
| ---- | ---- |
| 目录 | Cyan |
| 代码 | Green |
| 图片 | Pink |
| 媒体 | Orange |
| 压缩包 | Yellow |
| 可执行 | Red |
| 配置 | Purple |
| 文本/文档 | Foreground |
