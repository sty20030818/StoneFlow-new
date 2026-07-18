# StoneFlow Windows Quick Window 阴影与边框方案

> **版本**：v1.0  
> **状态**：Windows P0 视觉实现方案  
> **适用范围**：StoneFlow Quick Window / Quick Create 独立窗口在 Windows 上的阴影、边框、透明窗口与定位实现  
> **最终方案**：方案 A —— **透明 Tauri 窗口 + Shadow Padding + CSS 阴影 + CSS 边框**

---

## 0. 一句话结论

Windows 端 Quick Window 不依赖系统原生窗口阴影，而是使用：

```txt
Tauri 透明窗口
+ decorations: false
+ shadow: false
+ 内部 shadow padding
+ CSS 自绘 panel 阴影
+ CSS 自绘边框 / 内高光
```

核心原则：

```txt
真实窗口尺寸 ≠ 视觉面板尺寸
真实窗口尺寸 = 视觉面板尺寸 + 阴影安全区 * 2
```

原因：

- CSS `box-shadow` 无法绘制到真实窗口边界之外。
- 如果窗口尺寸刚好等于面板尺寸，阴影一定会被裁切。
- Windows undecorated window 的系统 shadow 容易出现白边、圆角不一致、不可控等问题。
- CSS 自绘阴影最可控，也最适合 StoneFlow 的浅色 Linear 风格。

---

## 1. 目标与非目标

### 1.1 目标

本方案要解决：

- Quick Window 外阴影被裁切。
- 浮窗边框不够精致。
- Windows 端置顶窗口缺少悬浮层次。
- 阴影、边线、圆角在不同状态下保持一致。
- 折叠态 / 展开态高度变化时，阴影不被裁切。
- 后续可与 macOS NSPanel 方案形成平台分治。

### 1.2 非目标

本方案暂不解决：

- macOS NSPanel 阴影。
- macOS Space / 全屏 App 上的层级行为。
- Windows click-through 透明区域。
- 原生 DWM 阴影深度定制。
- 多主题完整视觉规范。
- Quick Create 产品交互本身。

---

## 2. 问题本质

### 2.1 为什么 CSS 阴影会被裁切

如果真实窗口尺寸是：

```txt
720 × 360
```

同时视觉面板也是：

```txt
720 × 360
```

CSS 写：

```css
.quick-panel {
  width: 720px;
  height: 360px;
  box-shadow: 0 24px 56px rgba(8, 12, 36, 0.14);
}
```

那么阴影会尝试绘制到面板外部，但 WebView 的可绘制区域只有真实窗口大小。超出窗口边界的部分不会显示，因此被裁切。

### 2.2 正确模型

应当把真实窗口和视觉面板分开：

```txt
真实 Tauri Window：784 × 424
透明安全区：32px
视觉 Panel：720 × 360
```

示意：

```txt
┌──────────────────────────────────────────────┐
│                透明 shadow padding            │
│                                              │
│      ┌────────────────────────────────┐      │
│      │        StoneFlow Panel          │      │
│      │        CSS border/shadow        │      │
│      └────────────────────────────────┘      │
│                                              │
│                透明 shadow padding            │
└──────────────────────────────────────────────┘
```

### 2.3 最关键规则

```txt
真实窗口负责提供透明画布
视觉面板负责绘制背景、边框和阴影
```

---

## 3. 最终选型

### 3.1 采用方案

```txt
方案 A：CSS Shadow + 透明窗口 + Shadow Padding
```

### 3.2 不采用系统原生阴影作为 P0 主方案

暂不采用：

```txt
Tauri shadow: true
```

原因：

- Windows 上 undecorated window 的系统 shadow 不够可控。
- 可能出现 1px 白边。
- Windows 10 / Windows 11 表现不一致。
- 系统圆角、系统阴影与自定义圆角可能冲突。
- StoneFlow 需要更稳定统一的浅色浮窗视觉。

### 3.3 P0 结论

```txt
decorations: false
transparent: true
shadow: false
resizable: false
skipTaskbar: true
alwaysOnTop: true
CSS 自绘阴影和边框
```

---

## 4. 窗口尺寸策略

### 4.1 基础变量

推荐：

```txt
panelWidth: 720px
shadowPadding: 32px
windowWidth: 720 + 32 * 2 = 784px
```

高度按面板状态变化。

### 4.2 折叠态

```txt
collapsedPanelHeight: 340px
shadowPadding: 32px
collapsedWindowHeight: 340 + 32 * 2 = 404px
```

### 4.3 展开态

```txt
expandedPanelHeight: 408px
shadowPadding: 32px
expandedWindowHeight: 408 + 32 * 2 = 472px
```

### 4.4 推荐尺寸表

| 状态 | Panel 宽 | Panel 高 | Padding | Window 宽 | Window 高 |
|---|---:|---:|---:|---:|---:|
| 折叠态 | 720 | 340 | 32 | 784 | 404 |
| 展开态 | 720 | 408 | 32 | 784 | 472 |
| 搜索结果较多 | 720 | 440 | 32 | 784 | 504 |

### 4.5 尺寸计算公式

```ts
const SHADOW_PADDING = 32;
const PANEL_WIDTH = 720;

const windowWidth = PANEL_WIDTH + SHADOW_PADDING * 2;
const windowHeight = panelHeight + SHADOW_PADDING * 2;
```

---

## 5. Tauri Window 配置

### 5.1 推荐配置

```json
{
  "label": "quick-create",
  "title": "StoneFlow Quick Create",
  "url": "/quick-create",
  "width": 784,
  "height": 404,
  "decorations": false,
  "transparent": true,
  "shadow": false,
  "resizable": false,
  "skipTaskbar": true,
  "alwaysOnTop": true,
  "visible": false,
  "center": false
}
```

### 5.2 配置说明

| 配置 | 值 | 说明 |
|---|---:|---|
| `decorations` | `false` | 去掉系统标题栏和边框 |
| `transparent` | `true` | 允许 shadow padding 区域透明 |
| `shadow` | `false` | 不使用系统阴影，避免白边和不可控表现 |
| `resizable` | `false` | Quick Window 尺寸由程序控制 |
| `skipTaskbar` | `true` | 不出现在任务栏 |
| `alwaysOnTop` | `true` | 作为全局浮窗置顶 |
| `visible` | `false` | 懒显示，避免启动闪烁 |
| `center` | `false` | 由窗口定位算法控制位置 |

### 5.3 创建时机

推荐：

```txt
HelperReady
  ↓
首次快捷键触发
  ↓
创建 Quick Window
  ↓
设置位置
  ↓
show + focus
  ↓
后续复用
```

不要每次都 destroy / recreate。

---

## 6. DOM 结构

### 6.1 推荐结构

```tsx
export function QuickCreateWindow() {
  return (
    <div className="quick-window-root">
      <div className="quick-panel">
        {/* Quick Create UI */}
      </div>
    </div>
  );
}
```

### 6.2 层级职责

| 元素 | 职责 |
|---|---|
| `html/body/#root` | 全窗口透明画布，不负责视觉 |
| `.quick-window-root` | 提供 shadow padding |
| `.quick-panel` | 真正视觉面板，负责背景、圆角、边框、阴影 |
| `.quick-panel::before` | 内高光 / 内暗线 |

---

## 7. CSS 基础实现

### 7.1 基础变量

```css
:root {
  --sf-shadow-padding: 32px;
  --sf-panel-radius: 14px;
  --sf-panel-bg: #fcfcfd;
  --sf-panel-border: rgba(30, 34, 45, 0.13);
}
```

### 7.2 根节点透明设置

```css
html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  overflow: hidden;
}
```

说明：

- `background: transparent` 保证窗口透明区不出现白底。
- `overflow: hidden` 限制 WebView 内容不要超出真实窗口。
- 外阴影不会被裁切，因为阴影已经在窗口内部 padding 区域内。

### 7.3 Shadow Padding 容器

```css
.quick-window-root {
  width: 100%;
  height: 100%;
  padding: var(--sf-shadow-padding);
  box-sizing: border-box;
  background: transparent;
}
```

说明：

- 这个容器的 padding 就是 CSS 阴影可绘制区域。
- padding 不要太小，否则阴影仍然可能被裁。
- padding 不要太大，否则透明区域会挡住下方应用点击。

### 7.4 Panel 基础样式

```css
.quick-panel {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--sf-panel-radius);
  border: 1px solid var(--sf-panel-border);
  background: var(--sf-panel-bg);
  overflow: hidden;
  box-shadow:
    0 24px 56px rgba(8, 12, 36, 0.14),
    0 6px 18px rgba(8, 12, 36, 0.08);
}
```

### 7.5 内高光与内暗线

```css
.quick-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -1px 0 rgba(8, 12, 36, 0.035);
}
```

作用：

```txt
顶部内高光：让浅色面板更轻、更精致
底部内暗线：让面板有一点厚度
```

---

## 8. 阴影方案参数

### 8.1 推荐默认值：克制高级

```css
.quick-panel {
  box-shadow:
    0 24px 56px rgba(8, 12, 36, 0.14),
    0 6px 18px rgba(8, 12, 36, 0.08);
}
```

适合：

```txt
StoneFlow P0 默认视觉
浅色 Linear 风格
不夸张、不网页 modal 化
```

### 8.2 更强浮起感

```css
.quick-panel {
  box-shadow:
    0 32px 80px rgba(8, 12, 36, 0.18),
    0 10px 28px rgba(8, 12, 36, 0.10);
}
```

适合：

```txt
更像 Raycast / Spotlight 的强浮层
```

缺点：

- 视觉更重。
- 需要更大的 shadow padding。
- 可能更像网页弹窗。

### 8.3 更轻 Linear 风格

```css
.quick-panel {
  box-shadow:
    0 18px 44px rgba(8, 12, 36, 0.12),
    0 4px 14px rgba(8, 12, 36, 0.07);
}
```

适合：

```txt
更克制、更扁平、更接近 Linear 浅色风格
```

### 8.4 最终建议

P0 使用：

```txt
克制高级版
```

也就是：

```css
box-shadow:
  0 24px 56px rgba(8, 12, 36, 0.14),
  0 6px 18px rgba(8, 12, 36, 0.08);
```

---

## 9. 边框方案

### 9.1 基础边框

```css
border: 1px solid rgba(30, 34, 45, 0.13);
```

不要使用过黑边框。

不建议：

```css
border: 1px solid #000;
```

也不建议边框太淡，否则白色面板和背景之间层次不足。

### 9.2 浅色浮窗推荐边线

候选：

```css
rgba(30, 34, 45, 0.10)
rgba(30, 34, 45, 0.12)
rgba(30, 34, 45, 0.13)
rgba(30, 34, 45, 0.14)
```

推荐：

```css
rgba(30, 34, 45, 0.13)
```

### 9.3 内部描边

通过 `::before` 做内高光和底部暗线。

这样比单纯 border 更有质感：

```txt
外边框定义轮廓
顶部内高光定义光照
底部内暗线定义厚度
```

---

## 10. 圆角策略

### 10.1 推荐圆角

```css
--sf-panel-radius: 14px;
```

候选范围：

| 圆角 | 感觉 |
|---:|---|
| 10px | 偏硬，偏工程 |
| 12px | 克制，常规 |
| 14px | 推荐，轻柔但不幼稚 |
| 16px | 更现代，更浮层 |
| 20px+ | 偏移动端 / 卡片感太强 |

### 10.2 Panel 内部裁切

```css
.quick-panel {
  overflow: hidden;
}
```

原因：

- 内部输入区、结果区、footer 需要被圆角裁切。
- 阴影不会受影响，因为阴影在 panel 外，但仍处于 root padding 范围内。

---

## 11. 窗口定位策略

### 11.1 定位必须基于视觉面板

错误做法：

```ts
windowY = monitor.y + monitor.height * 0.2;
```

这会导致视觉面板实际下移 `shadowPadding`。

正确做法：

```ts
windowY = panelY - shadowPadding;
```

### 11.2 定位公式

```ts
type Monitor = {
  position: { x: number; y: number };
  size: { width: number; height: number };
};

const SHADOW_PADDING = 32;
const PANEL_WIDTH = 720;

function getQuickWindowBounds(monitor: Monitor, panelHeight: number) {
  const windowWidth = PANEL_WIDTH + SHADOW_PADDING * 2;
  const windowHeight = panelHeight + SHADOW_PADDING * 2;

  const panelX = monitor.position.x + (monitor.size.width - PANEL_WIDTH) / 2;
  const panelY = monitor.position.y + monitor.size.height * 0.2;

  return {
    x: Math.round(panelX - SHADOW_PADDING),
    y: Math.round(panelY - SHADOW_PADDING),
    width: Math.round(windowWidth),
    height: Math.round(windowHeight),
  };
}
```

### 11.3 屏幕位置建议

Quick Window 不建议绝对居中。

推荐：

```txt
视觉面板顶部位置 = 屏幕高度 18% - 24%
```

默认：

```txt
20%
```

原因：

- 更接近 Spotlight / Raycast 类入口。
- 视觉上更像命令入口。
- 不遮挡屏幕中心内容太多。

---

## 12. 折叠态 / 展开态处理

### 12.1 状态尺寸

```ts
const QUICK_PANEL = {
  width: 720,
  collapsedHeight: 340,
  expandedHeight: 408,
  shadowPadding: 32,
};
```

### 12.2 展开时更新窗口尺寸

流程：

```txt
用户点击更多参数
  ↓
前端状态 expanded = true
  ↓
通知 Helper 更新窗口尺寸
  ↓
Helper 计算新 window bounds
  ↓
setSize + setPosition
```

### 12.3 保持视觉面板位置稳定

展开时不应该让面板顶部跳动。

推荐：

```txt
保持 panelX / panelY 不变
只增加真实 window height
windowY 仍然 = panelY - shadowPadding
```

这样展开时是向下扩展。

### 12.4 伪代码

```ts
function resizeQuickWindow(expanded: boolean, monitor: Monitor) {
  const panelHeight = expanded
    ? QUICK_PANEL.expandedHeight
    : QUICK_PANEL.collapsedHeight;

  const bounds = getQuickWindowBounds(monitor, panelHeight);

  quickWindow.setSize({
    width: bounds.width,
    height: bounds.height,
  });

  quickWindow.setPosition({
    x: bounds.x,
    y: bounds.y,
  });
}
```

---

## 13. Windows 特殊注意事项

### 13.1 透明 padding 会吃鼠标

透明区域仍属于窗口。

结果：

```txt
shadow padding 区域可能挡住下面应用点击
```

P0 处理：

```txt
接受该限制
控制 padding 在 24px - 32px
窗口短暂出现，不做复杂 click-through
```

暂不做：

```txt
透明区域点击穿透
```

### 13.2 Shadow Padding 不要过大

推荐：

```txt
24px - 32px
```

不建议：

```txt
48px+
```

原因：

- 透明命中区域过大。
- 窗口定位更麻烦。
- 鼠标点击遮挡范围更大。

### 13.3 透明窗口异常兜底

Windows WebView2 / Tauri 透明窗口可能在部分环境出现异常。

兜底策略：

```txt
1. 创建后延迟 show
2. show 前先 setSize / setPosition
3. show 后必要时再次 setSize
4. 如果透明仍异常，降级为无外阴影方案
```

### 13.4 DPI 与缩放

Windows 多屏时可能有不同缩放比例。

原则：

```txt
窗口定位与尺寸必须使用 Tauri / 系统返回的逻辑坐标体系
不要混用物理像素和 CSS 像素
```

需要测试：

- 100% 缩放。
- 125% 缩放。
- 150% 缩放。
- 多显示器不同缩放。

---

## 14. 降级方案

### 14.1 触发条件

如果出现：

- 透明窗口不透明。
- 透明区域闪白。
- 阴影异常。
- WebView2 渲染问题。
- 透明窗口严重影响输入法或焦点。

则启用降级方案。

### 14.2 降级配置

```json
{
  "decorations": false,
  "transparent": false,
  "shadow": false,
  "resizable": false,
  "skipTaskbar": true,
  "alwaysOnTop": true
}
```

### 14.3 降级 CSS

```css
html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  background: #fcfcfd;
  overflow: hidden;
}

.quick-window-root {
  width: 100%;
  height: 100%;
  padding: 0;
  background: #fcfcfd;
}

.quick-panel {
  width: 100%;
  height: 100%;
  border-radius: 0;
  border: 1px solid rgba(30, 34, 45, 0.13);
  background: #fcfcfd;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -1px 0 rgba(8, 12, 36, 0.035);
}
```

### 14.4 降级效果

优点：

- 稳定。
- 不裁切。
- 不依赖透明窗口。
- 不会有透明区域点击遮挡。

缺点：

- 没有真正外阴影。
- 浮窗感下降。
- 更像普通无边框窗口。

---

## 15. 推荐最终代码片段

### 15.1 CSS 完整推荐版

```css
:root {
  --sf-shadow-padding: 32px;
  --sf-panel-radius: 14px;
  --sf-panel-bg: #fcfcfd;
  --sf-panel-border: rgba(30, 34, 45, 0.13);
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  overflow: hidden;
}

.quick-window-root {
  width: 100%;
  height: 100%;
  padding: var(--sf-shadow-padding);
  box-sizing: border-box;
  background: transparent;
}

.quick-panel {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--sf-panel-radius);
  border: 1px solid var(--sf-panel-border);
  background: var(--sf-panel-bg);
  overflow: hidden;
  box-shadow:
    0 24px 56px rgba(8, 12, 36, 0.14),
    0 6px 18px rgba(8, 12, 36, 0.08);
}

.quick-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -1px 0 rgba(8, 12, 36, 0.035);
}
```

### 15.2 React 结构

```tsx
export function QuickCreateWindow() {
  return (
    <div className="quick-window-root">
      <section className="quick-panel">
        {/* Quick Create content */}
      </section>
    </div>
  );
}
```

### 15.3 尺寸常量

```ts
export const QUICK_WINDOW_LAYOUT = {
  panelWidth: 720,
  collapsedPanelHeight: 340,
  expandedPanelHeight: 408,
  shadowPadding: 32,
  panelTopRatio: 0.2,
};

export function getQuickWindowSize(expanded: boolean) {
  const panelHeight = expanded
    ? QUICK_WINDOW_LAYOUT.expandedPanelHeight
    : QUICK_WINDOW_LAYOUT.collapsedPanelHeight;

  return {
    width: QUICK_WINDOW_LAYOUT.panelWidth + QUICK_WINDOW_LAYOUT.shadowPadding * 2,
    height: panelHeight + QUICK_WINDOW_LAYOUT.shadowPadding * 2,
  };
}
```

### 15.4 定位函数

```ts
type MonitorLike = {
  position: { x: number; y: number };
  size: { width: number; height: number };
};

export function getQuickWindowBounds(monitor: MonitorLike, expanded: boolean) {
  const panelHeight = expanded
    ? QUICK_WINDOW_LAYOUT.expandedPanelHeight
    : QUICK_WINDOW_LAYOUT.collapsedPanelHeight;

  const windowWidth = QUICK_WINDOW_LAYOUT.panelWidth + QUICK_WINDOW_LAYOUT.shadowPadding * 2;
  const windowHeight = panelHeight + QUICK_WINDOW_LAYOUT.shadowPadding * 2;

  const panelX = monitor.position.x + (monitor.size.width - QUICK_WINDOW_LAYOUT.panelWidth) / 2;
  const panelY = monitor.position.y + monitor.size.height * QUICK_WINDOW_LAYOUT.panelTopRatio;

  return {
    x: Math.round(panelX - QUICK_WINDOW_LAYOUT.shadowPadding),
    y: Math.round(panelY - QUICK_WINDOW_LAYOUT.shadowPadding),
    width: Math.round(windowWidth),
    height: Math.round(windowHeight),
  };
}
```

---

## 16. 测试清单

### 16.1 阴影测试

- 阴影没有被窗口边界裁切。
- 折叠态阴影完整。
- 展开态阴影完整。
- 窗口移动到屏幕边缘时阴影表现正常。
- 多显示器时阴影表现正常。

### 16.2 边框测试

- 边框清晰但不重。
- 浅色背景下边线可见。
- 深浅不同桌面壁纸下边线可见。
- 内高光没有过度发白。
- 底部内暗线不过脏。

### 16.3 透明窗口测试

- 窗口外圈透明。
- 透明区域不显示白底。
- 透明区域没有闪烁。
- 打开窗口时没有白框闪烁。
- 关闭窗口时没有残影。

### 16.4 Windows 版本测试

- Windows 10。
- Windows 11。
- 100% 缩放。
- 125% 缩放。
- 150% 缩放。
- 多显示器不同缩放。

### 16.5 交互测试

- 透明 padding 区域是否挡住点击。
- Quick Window 显示时输入框能正常 focus。
- Esc 关闭后焦点返回原应用。
- alwaysOnTop 生效。
- skipTaskbar 生效。
- Alt-Tab 行为符合预期。

### 16.6 展开/收起测试

- 展开更多参数时，面板顶部位置不跳动。
- 展开后底部阴影不裁切。
- 收起后窗口尺寸恢复。
- 多次展开/收起没有位置漂移。

---

## 17. 最终决策记录

| 决策 | 结果 |
|---|---|
| Windows 阴影方案 | CSS 自绘阴影 |
| 是否使用透明窗口 | 是 |
| 是否使用系统 shadow | 否 |
| Window decorations | false |
| Shadow padding | 32px |
| Panel width | 720px |
| Panel radius | 14px |
| 边框 | `rgba(30, 34, 45, 0.13)` |
| 阴影 | 克制高级双层阴影 |
| 内高光 | 使用 `::before` inset shadow |
| 展开态处理 | 同步更新真实窗口尺寸 |
| 定位基准 | 视觉 panel，而不是真实 window |
| 透明异常兜底 | 不透明窗口 + 内阴影 |

---

## 18. 最终摘要

Windows 端 Quick Window 的正确实现方式是：

```txt
把真实 Tauri 窗口当作透明画布
把 Quick Panel 当作真正视觉对象
用 shadow padding 给 CSS 阴影留空间
用 CSS 控制阴影、边框、圆角、内高光
不用 Windows 系统阴影作为 P0 主方案
```

最重要的一条工程规则：

```txt
所有窗口尺寸和定位都必须考虑 shadowPadding。
```

最终视觉目标：

```txt
轻
稳
克制
有浮起感
不像网页弹窗
符合 StoneFlow 浅色 Linear 风格
```

