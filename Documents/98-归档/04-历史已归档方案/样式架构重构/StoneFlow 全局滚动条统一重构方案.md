# StoneFlow 全局滚动条统一重构方案

> 版本：v1.0
> 状态：待实施
> 目标：将 StoneFlow 内部主要纵向滚动区域统一替换为自定义 Overlay Scrollbar 体系
> 适用范围：`/Users/sty/Desktop/StoneFlow-new`
> 关联代码：
> - `src/shared/ui/OverlayScrollbar.tsx`
> - `src/styles/utilities.css`
> - `src/app/layouts/main-card/MainCardLayout.tsx`
> - `src/shared/ui/base/command.tsx`
> - `src/shared/ui/base/select.tsx`
> - `src/shared/ui/base/dropdown-menu.tsx`
> - `src/shared/ui/base/context-menu.tsx`

---

## 0. 文档目标

这份文档不讨论“要不要统一滚动条”，而是直接回答下面几个工程问题：

1. 当前仓库里的滚动条现状到底是什么；
2. 为什么不能只靠一份全局 CSS 完成替换；
3. 推荐采用什么实现边界；
4. 应该按什么批次替换，才能风险最低；
5. 哪些范围本轮要做，哪些故意不做。

本文档的目标不是视觉提案，而是后续实现合同。

---

## 1. 现状判断

先给结论：

```txt
当前仓库已经有“我们自己的滚动条实现”，但它还不是统一基础设施，只是一个零散接入的 overlay 组件。
```

### 1.1 已存在的自定义滚动条能力

当前仓库已有：

```txt
src/shared/ui/OverlayScrollbar.tsx
```

它具备的能力：

1. 基于 `scrollRef` 计算 thumb 几何；
2. 支持 hover / dragging / idle 三态；
3. 支持最小 thumb 高度；
4. 支持 track 顶部和底部 inset；
5. 支持拖拽 thumb 改变滚动位置；
6. 不依赖浏览器原生滚动条外观。

这说明方向已经是对的，问题不在“没有实现”，而在“没有收口为统一协议”。

### 1.2 当前仓库的主要问题

当前多数滚动区域仍然是以下模式：

```txt
overflow-y-auto + no-scrollbar
```

例如：

1. `MainCardLayout`
2. `ShellSidebar`
3. `TaskDrawerContent`
4. `GlobalSearchResults`
5. `CommandList`
6. 各类 `Select / Dropdown / ContextMenu` 内容区

此外，`src/styles/utilities.css` 里的 `no-scrollbar` 只是隐藏原生滚动条：

```txt
scrollbar-width: none
::-webkit-scrollbar { display: none }
```

它并没有把这些区域真正切换到自定义滚动条体系。

### 1.3 当前为什么不能“一键全局替换”

原因很明确：

1. 现有 `OverlayScrollbar` 不是 CSS 皮肤，而是带 `scrollRef` 的 React 组件；
2. 当前滚动容器分散在页面层、layout 层、feature 层、base primitive 层；
3. 部分滚动容器属于 Radix Portal 弹层，结构和普通页面容器不同；
4. 当前已有代码依赖特定 class selector 查找主滚动区，不能粗暴改掉。

最典型的一处是：

```txt
src/features/task/shortcuts/TaskRowShortcutScope.tsx
```

这里目前通过 `.no-scrollbar.overflow-y-auto` 查找主滚动容器。如果直接把 class 模式删掉，不同步调整 selector，就会产生快捷键相关回归。

因此，本次不是“改滚动条样式”，而是“统一滚动容器协议”。

---

## 2. 本次推荐方向

本次推荐方向只有一个：

> 不做全局 CSS 伪装，不做零散复制接入，正式建立统一 ScrollArea primitive，再分批替换业务容器。

这比“每个地方手写一遍 `OverlayScrollbar`”更稳，也比“改原生滚动条样式假装统一”更符合你的目标。

### 2.1 推荐方案

新增统一滚动容器，例如：

```txt
src/shared/ui/AppScrollArea.tsx
```

或

```txt
src/shared/ui/base/scroll-area.tsx
```

推荐由它统一负责：

1. 滚动 viewport；
2. `no-scrollbar` 默认处理；
3. `OverlayScrollbar` 自动挂载；
4. `trackInsetTop / trackInsetBottom` 参数；
5. `thumbClassName`、`viewportClassName` 等扩展口；
6. 稳定的 `data-scroll-container` 标记；
7. 主滚动区、面板滚动区、弹层滚动区的轻量变体。

### 2.2 不推荐的方向

#### 方向 A：只改全局 CSS

不推荐原因：

1. 这不能复用你们“自己写的那个”；
2. 原生滚动条平台差异仍然存在；
3. hover / active / drag 交互无法统一；
4. 页面级和弹层级体验仍然不一致。

#### 方向 B：每个业务文件手写 `ref + OverlayScrollbar`

不推荐原因：

1. 重复代码太多；
2. 容易漏；
3. 后续新增滚动区时仍会继续散；
4. 统一样式和行为会重新失控。

---

## 3. 本次范围边界

### 3.1 本轮要做

本轮只做：

1. 统一主要纵向滚动条；
2. 建立统一滚动容器 primitive；
3. 替换页面级和面板级主要滚动区；
4. 为后续弹层滚动区替换建立协议；
5. 清理旧的主滚动区 selector 依赖。

### 3.2 本轮不做

本轮明确不做：

1. 横向滚动条统一；
2. 浏览器原生 `::-webkit-scrollbar` 全局皮肤方案；
3. 所有文档 demo / 旧 HTML 的同步改造；
4. 为未来未知场景提前做复杂配置系统；
5. 再造一套比当前需求更重的滚动框架。

### 3.3 为什么先不做横向滚动

原因不是不能做，而是当前不值得一起做：

1. 现有 `OverlayScrollbar` 只有纵向能力；
2. 横向滚动区域在仓库里占比低；
3. 横向滚动常见于 chips、debug block、长文本区域，收益远低于纵向主内容区；
4. 一起做会明显提高 primitive 复杂度和回归成本。

结论：

```txt
第一轮先统一纵向，第二轮再评估横向是否值得单独补。
```

---

## 4. 目标结构

推荐目标结构：

```txt
src/shared/ui/
├── OverlayScrollbar.tsx          # 低层 overlay thumb 能力
├── AppScrollArea.tsx             # 统一业务滚动容器
└── base/
    └── ...                       # 基础 primitive 逐步接入 AppScrollArea
```

职责划分如下。

### 4.1 `OverlayScrollbar` 负责什么

`OverlayScrollbar` 继续只负责：

1. thumb 几何计算；
2. pointer drag 行为；
3. 可见性控制；
4. track / thumb 的视觉态切换。

它不负责：

1. 滚动内容结构；
2. feature 级布局；
3. 哪个元素应该成为 viewport；
4. 业务层 selector 协议。

### 4.2 `AppScrollArea` 负责什么

`AppScrollArea` 负责：

1. 提供统一 viewport 结构；
2. 管理 `scrollRef`；
3. 默认接入 `OverlayScrollbar`；
4. 暴露 className 和必要变体；
5. 给滚动容器打稳定数据标记；
6. 承接后续业务容器和基础弹层的统一接入。

### 4.3 页面 / feature 层负责什么

页面和 feature 层只负责：

1. 决定哪里需要滚动；
2. 决定容器几何和 padding；
3. 决定该区域属于哪种 scroll variant；
4. 不再重复手写滚动条接线。

---

## 5. 推荐实施批次

本次推荐按四个阶段推进。

---

## 6. 阶段 0：建立统一 primitive

### 6.1 目标

先把统一滚动容器做出来，禁止继续在新代码里裸写：

```txt
overflow-y-auto + no-scrollbar
```

### 6.2 本阶段任务

1. 新增 `AppScrollArea`；
2. 支持最基础的纵向滚动；
3. 内部复用现有 `OverlayScrollbar`；
4. 提供 `viewportClassName` 与外层 `className`；
5. 约定统一数据标记，例如：

```txt
data-scroll-container
data-scroll-container-role="main-card"
```

6. 保留最小必要的扩展口，避免一开始做成超重组件。

### 6.3 本阶段完成标准

完成后应该满足：

1. 任意业务页面可以不手写 `ref` 就接入自定义滚动条；
2. 主滚动区可以通过 `data-*` 标记稳定定位；
3. 后续替换不需要再讨论接线方式。

---

## 7. 阶段 1：替换高价值页面级滚动区

这阶段只吃“可见收益最高、结构最稳定”的区域。

### 7.1 推荐优先替换范围

1. `src/app/layouts/main-card/MainCardLayout.tsx`
2. `src/app/layouts/shell/ShellSidebar.tsx`
3. `src/features/task-drawer/ui/TaskDrawerContent.tsx`
4. `src/features/global-search/ui/GlobalSearchResults.tsx`
5. `src/features/command/ui/CommandMenu.tsx`
6. `src/features/command/ui/ShortcutHelp.tsx`

### 7.2 这阶段为什么先替换这些

原因：

1. 用户感知最强；
2. 大多数是稳定页面容器，不是复杂 portal；
3. 可以先把主界面和主要交互区统一掉；
4. 替换后最容易观察视觉和交互质量。

### 7.3 本阶段注意点

1. `MainCard` 主滚动区的 selector 依赖必须一起改；
2. sidebar 这类区域要确认 thumb 不会压住内容点击区；
3. drawer 内容区要确认遮罩、sticky 区块和 inset 的关系；
4. global search 结果区要确认 `scrollIntoView` 不受影响；
5. command list 要确认键盘选中项滚动保持正常。

---

## 8. 阶段 2：替换基础弹层滚动区

这阶段才处理基础 primitive。

### 8.1 推荐范围

1. `src/shared/ui/base/command.tsx`
2. `src/shared/ui/base/select.tsx`
3. `src/shared/ui/base/dropdown-menu.tsx`
4. `src/shared/ui/base/context-menu.tsx`
5. 后续若存在 `Popover`、`Combobox`、`Sheet` 等相同模式容器，也按同一协议补齐

### 8.2 这阶段为什么放到第二批

因为这些组件有额外复杂度：

1. Radix Portal 结构和普通页面容器不同；
2. 有自己的 max-height 和 transform-origin 变量；
3. 某些组件带 keyboard navigation；
4. `Select` 还自带 `ScrollUpButton / ScrollDownButton`；
5. 不当包裹可能影响 focus、定位或动画。

### 8.3 这阶段的实施原则

1. 以“保持原结构稳定”为优先；
2. 不为了统一而打断 Radix 的布局契约；
3. 能只替换 viewport 的，就不要重写 content 结构；
4. 如某个 primitive 接入成本明显过高，可以单独延后，不硬吃。

---

## 9. 阶段 3：清理与补漏

### 9.1 本阶段任务

1. 全仓重新扫描 `overflow-y-auto`、`overflow-x-auto`、`no-scrollbar`；
2. 标注哪些区域应继续保留原生滚动；
3. 删除已经被新 primitive 吃掉的重复接线；
4. 收口主滚动区和快捷键逻辑中的旧 selector；
5. 确认没有因为替换导致新的双状态源。

### 9.2 需要重点复查的类型

1. 结果列表；
2. 右键菜单；
3. 选择器下拉；
4. 长表单；
5. drawer；
6. 多层嵌套滚动区。

---

## 10. 验收标准

本次完成不是“看起来有滚动条”就算结束，而要满足以下验收边界。

### 10.1 架构验收

1. 新增统一 ScrollArea primitive；
2. 页面级主要纵向滚动区不再散写 `ref + OverlayScrollbar`；
3. 主滚动区不再依赖脆弱 class selector；
4. 新代码默认通过统一 primitive 接入。

### 10.2 视觉验收

1. 主内容区、侧边栏、drawer、命令面板的滚动条视觉一致；
2. thumb 宽度、圆角、颜色态一致；
3. 不出现内容被 thumb 明显遮住的问题；
4. 不出现某些容器还在显示原生滚动条、某些容器完全没滚动提示的割裂状态。

### 10.3 交互验收

1. 鼠标滚轮滚动正常；
2. 触控板滚动正常；
3. 拖拽 thumb 正常；
4. 列表键盘导航时自动滚动正常；
5. `scrollIntoView` 等现有逻辑不回归；
6. 嵌套滚动容器不会异常抢滚轮。

### 10.4 范围验收

本轮验收以“纵向主要滚动区统一”作为完成标准，不要求横向同步完成。

---

## 11. 风险与注意事项

### 11.1 主滚动区选择器回归风险

当前已有逻辑通过 class 查找滚动容器。

如果只替换 UI 不同步改 selector，会直接出现：

1. 快捷键滚动失效；
2. 聚焦项不自动进入可视区；
3. 主卡片滚动行为异常。

### 11.2 Portal 弹层结构风险

Radix 弹层不能简单粗暴外包一层滚动组件。

如果包裹层级不对，可能导致：

1. 高度计算错误；
2. 定位抖动；
3. 动画 origin 异常；
4. focus ring 或 pointer 事件异常。

### 11.3 视觉 hit area 风险

overlay thumb 是浮在内容上的。

如果右侧内容本来就很贴边，可能出现：

1. 最后一列内容被遮挡；
2. hover 热区过窄或过宽；
3. sidebar 行右侧点击不顺。

因此需要在不同容器上检查是否需要轻微 `pr-*` 或 track inset 调整。

### 11.4 不要把方案做重

当前需求只是统一主要纵向滚动条，不需要一开始就做：

1. 横向滚动支持；
2. 自动显隐策略系统；
3. 动态主题滚动条工厂；
4. 完整 design token 配置化。

这些都属于典型过度设计。

---

## 12. 推荐落地顺序

如果按最稳的节奏推进，建议按下面顺序执行：

1. 新增 `AppScrollArea` primitive，并约定 `data-scroll-container` 协议；
2. 替换 `MainCardLayout`，同时修正依赖主滚动区的 selector；
3. 替换 `ShellSidebar`、`TaskDrawerContent`；
4. 替换 `GlobalSearchResults`、`CommandMenu`、`ShortcutHelp`；
5. 单独处理 `Select / Dropdown / ContextMenu / CommandList`；
6. 全仓扫描和补漏。

---

## 13. 最终结论

本次全局滚动条统一，正确问题不是：

```txt
怎么把浏览器原生滚动条换皮
```

而是：

```txt
怎么把 StoneFlow 的内部滚动容器正式收口成统一协议
```

推荐实施方向已经明确：

1. 先抽统一 ScrollArea primitive；
2. 第一批先统一页面级主要纵向滚动区；
3. 第二批再吃 Radix 弹层滚动区；
4. 第一轮不做横向滚动统一；
5. 同步收口主滚动区 selector，避免快捷键和聚焦逻辑回归。

这是当前复杂度最低、长期维护成本最低、也最符合现有仓库状态的方案。
