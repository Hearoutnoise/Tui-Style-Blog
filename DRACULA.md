# Dracula 配色板

来源：https://draculatheme.com/contribute

本项目的全部颜色均取自该色板，用于 CSS 变量 `--dt-*`。

## 色板

| Token        | Hex      | 用途                   |
| ------------ | -------- | ---------------------- |
| Background   | `#282A36` | 页面背景                 |
| Current Line | `#44475A` | 当前行、悬停、分隔         |
| Selection    | `#44475A` | 选中项                 |
| Foreground   | `#F8F8F2` | 正文、主文本             |
| Comment      | `#6272A4` | 次要文字、注释、元信息      |
| Red          | `#FF5555` | 强调、错误、警示           |
| Orange       | `#FFB86C` | 区分、中强调              |
| Yellow       | `#F1FA8C` | 高亮                   |
| Green        | `#50FA7B` | 成功、在线、关键字         |
| Cyan         | `#8BE9FD` | 链接、标签、蓝色系         |
| Purple       | `#BD93F9` | 装饰、品牌色              |
| Pink         | `#FF79C6` | 点缀、趣味元素            |

## CSS 变量

```css
:root {
  --dt-bg: #282a36;
  --dt-current: #44475a;
  --dt-selection: #44475a;
  --dt-fg: #f8f8f2;
  --dt-comment: #6272a4;
  --dt-red: #ff5555;
  --dt-orange: #ffb86c;
  --dt-yellow: #f1fa8c;
  --dt-green: #50fa7b;
  --dt-cyan: #8be9fd;
  --dt-purple: #bd93f9;
  --dt-pink: #ff79c6;
}
```
