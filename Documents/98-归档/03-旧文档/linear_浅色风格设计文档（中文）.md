# Linear 浅色风格设计文档（中文）

> 本文档是一份**基于 Linear 官方公开设计信息、公开品牌信息，以及现有深色主题文档结构推导整理而成的浅色主题规范**。它的目标不是复刻一份不存在的官方内部 spec，而是沉淀出一套**足够接近 Linear 气质、可工程落地、可约束 AI 产出**的浅色主题设计语言。
>
> 这是一份**产品级浅色主题约束文档**，不是品牌手册，也不是营销页视觉稿说明。

---

## 1. 视觉主题与整体气质

Linear 的浅色风格不是传统 SaaS 那种“白底 + 蓝按钮 + 灰边框”的常规企业感，也不是充满装饰性层次的 Dribbble 风格。它更像一种**高精度、低噪音、强秩序感**的界面语言：画面极度克制，边界清晰但不生硬，层级明确但不过度依赖阴影，强调信息组织与操作效率，而不是情绪化表达。

浅色主题下，Linear 风格的核心不在于“足够白”，而在于：

- 页面底色保持**低饱和、轻雾感的浅灰白**，避免纯白刺眼
- 主要内容面使用**接近白色但略有区分的表面层级**
- 层级依赖**亮度差、hairline 边框、极轻阴影、文字对比**共同建立
- 品牌色只作为**交互强调与焦点颜色**，不进入大面积 UI chrome
- 整体应呈现一种**安静、锐利、克制、工程化**的气质

它不是把深色主题简单反相，而是在浅色语境下，重新建立一套：

- 更柔和的背景
- 更清晰的边界
- 更克制的表面高光
- 更稳定的文字层级
- 更节制的品牌色介入方式

### 关键词

- 安静（Calm）
- 精准（Precise）
- 克制（Restrained）
- 清晰（Crisp）
- 低饱和（Low-saturation）
- 工程化（Engineered）
- 高密度但不拥挤（Dense, not crowded）

### 浅色主题的核心体验目标

1. **亮而不刺**：不用纯白统治全局，而用浅灰白建立舒适底色。
2. **清晰但不硬**：边界清楚，但尽量避免厚重描边和大对比块面。
3. **有层级但不漂**：弹层、卡片、输入框需要浮起，但不能靠重阴影制造廉价悬浮感。
4. **品牌色很少但很准**：只在真正需要引导注意力和表达交互状态时出现。
5. **排版比装饰更重要**：字重、字号、行高、间距、对齐，是主要视觉秩序来源。

---

## 2. 色彩系统与角色定义

> 说明：以下色值分为两类。
>
> - **基础参考色**：来自现有文档中已出现的浅色 token 或与 Linear 公开品牌方向一致的色彩倾向。
> - **系统推导色**：为了形成可用的完整浅色主题体系而补全的色值与角色。
>
> 实际落地时建议将这些角色进一步抽象为 design tokens，而不是在组件中直接写死十六进制值。

### 2.1 背景与表面

#### Page / Canvas
- **Page Background / 页面主背景**：`#f7f8f8`
- **Page Background Alt / 页面替代背景**：`#f4f5f8`
- **Subtle Section Tint / 轻分区背景**：`#f3f4f5`

说明：
- `#f7f8f8` 作为默认页面背景最稳，干净、冷静、不刺眼。
- `#f4f5f8` 可以用于更偏品牌感、更偏 Linear 官网气质的浅底场景。
- 不建议大面积使用纯白作为页面底色。

#### Surfaces
- **Surface Base / 一级表面**：`#ffffff`
- **Surface Secondary / 二级表面**：`#f5f6f7`
- **Surface Tertiary / 三级表面**：`#f3f4f5`
- **Surface Hover / 浅悬浮态表面**：`#eef1f4`
- **Surface Active / 激活态表面**：`#e9edf2`

说明：
- 在浅色主题里，**真正的白色应优先保留给内容面、卡片面、输入面、弹层面**。
- 页面底不宜与卡片面同白，否则所有层级都会塌陷。
- hover / active 不依赖饱和度变化，而依赖轻微的灰阶收紧。

### 2.2 文本与图标

#### Text
- **Text Primary / 主文本**：`#222326`
- **Text Secondary / 次级文本**：`#4c5159`
- **Text Tertiary / 弱化文本**：`#6b7280`
- **Text Quaternary / 极弱文本**：`#8b93a1`
- **Text Disabled / 禁用文本**：`#a8b0bb`
- **Text On Accent / 品牌色按钮文字**：`#ffffff`

说明：
- 浅色主题的文本层级比深色主题更容易失控，务必控制层级数量。
- 主文本不要用纯黑，避免太硬。
- 次级和弱化文本必须拉开差距，否则内容会显得发灰、糊成一片。

#### Icons
- **Icon Primary**：`#3b4048`
- **Icon Secondary**：`#6b7280`
- **Icon Subtle**：`#9098a4`
- **Icon On Accent**：`#ffffff`

### 2.3 品牌与强调色

#### Brand / Accent
- **Brand Indigo / 品牌主色**：`#5e6ad2`
- **Accent Violet / 交互强调色**：`#7170ff`
- **Accent Hover / 悬停强调色**：`#828fff`
- **Accent Soft Background / 浅色强调底**：`#eef0ff`
- **Accent Soft Border / 浅色强调边框**：`#d9ddff`
- **Accent Soft Text / 浅色强调文字**：`#4f5ccf`

说明：
- 品牌色不要成为整个浅色主题的“主背景色”。
- 它更适合用于：主要 CTA、选中态、焦点态、链接、关键标签、少量状态高亮。
- 非 CTA 元素更适合使用柔和的浅强调底，而不是直接大面积实色。

### 2.4 状态色

#### Success
- **Success Strong**：`#27a644`
- **Success Soft Background**：`#ecf8ef`
- **Success Soft Border**：`#cdebd4`
- **Success Soft Text**：`#1f8a38`

#### Warning
- **Warning Strong**：`#b7791f`
- **Warning Soft Background**：`#fff7e8`
- **Warning Soft Border**：`#f4dfb4`
- **Warning Soft Text**：`#8c6419`

#### Danger
- **Danger Strong**：`#d14343`
- **Danger Soft Background**：`#fff1f1`
- **Danger Soft Border**：`#f3caca`
- **Danger Soft Text**：`#b83737`

#### Info
- **Info Strong**：`#3a72d8`
- **Info Soft Background**：`#eff5ff`
- **Info Soft Border**：`#d3e3ff`
- **Info Soft Text**：`#2f63c0`

说明：
- 状态色仍然应该比普通产品型 UI 更克制。
- 除非是必须强提醒，否则优先使用浅底 + 有色文字 + 轻边框，而不是高饱和大面积纯色块。

### 2.5 边框、分割线与轮廓

- **Border Primary / 标准边框**：`#d0d6e0`
- **Border Secondary / 次级边框**：`#e1e5ea`
- **Border Subtle / 极轻边框**：`#e8ebef`
- **Divider / 分割线**：`#eceff3`
- **Hairline Strong / 清晰细线**：`#cfd5de`

说明：
- 浅色主题的边界来自“轻但清晰”的 1px 线。
- 避免用太暖、太黄、太脏的浅灰边框。
- 不建议用重阴影替代边框。

### 2.6 Overlay

- **Overlay / 遮罩**：`rgba(17, 19, 24, 0.48)`
- **Overlay Heavy / 强聚焦遮罩**：`rgba(17, 19, 24, 0.60)`

说明：
- 弹层遮罩应偏中性深灰，而不是纯黑。
- 目标是隔离焦点，不是制造压迫感。

---

## 3. 字体与排版规则

### 3.1 字体家族

- **Primary**：`Inter Variable`
- **Fallbacks**：`SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`
- **Monospace**：`Berkeley Mono`
- **Mono Fallbacks**：`ui-monospace, SF Mono, Menlo, monospace`
- **OpenType Features**：`"cv01", "ss03"`

说明：
- `cv01` 与 `ss03` 不是锦上添花，而是风格成立的基础条件。
- 不启用时，气质会明显变普通。

### 3.2 字重策略

- **400**：阅读文本、正文、说明
- **510**：UI 默认强调、导航、标签、按钮、结构性信息
- **590**：较强强调、标题、小模块标题、重要数值

规则：
- 510 是系统性默认重点字重。
- 590 用于明确强调，但不能滥用。
- 不建议使用 700 作为常规 UI 字重。

### 3.3 字号层级

| 角色 | 大小 | 字重 | 行高 | 字距 | 用途 |
|---|---:|---:|---:|---:|---|
| Display XL | 72px | 510 | 1.00 | -1.584px | 品牌级大标题、极少数营销标题 |
| Display L | 64px | 510 | 1.00 | -1.408px | Hero 标题 |
| Display | 48px | 510 | 1.00 | -1.056px | 页面大标题 |
| H1 | 32px | 400 | 1.13 | -0.704px | 一级区块标题 |
| H2 | 24px | 400 | 1.33 | -0.288px | 二级区块标题 |
| H3 | 20px | 590 | 1.33 | -0.24px | 模块标题、卡片标题 |
| Body L | 18px | 400 | 1.60 | -0.165px | 导语、说明段落 |
| Body | 16px | 400 | 1.50 | normal | 标准正文 |
| Body M | 16px | 510 | 1.50 | normal | UI 标签、导航、结构信息 |
| Small | 15px | 400 | 1.60 | -0.165px | 次级正文 |
| Small M | 15px | 510 | 1.60 | -0.165px | 次级强调 |
| Caption L | 14px | 510 | 1.50 | -0.182px | 辅助标题、分类标签 |
| Caption | 13px | 400–510 | 1.50 | -0.13px | 元数据、时间、次级标签 |
| Label | 12px | 510 | 1.40 | normal | 按钮文本、小标签 |
| Micro | 11px | 510 | 1.40 | normal | 极小辅助信息 |
| Tiny | 10px | 400–510 | 1.50 | -0.15px | 角标、微标签 |

### 3.4 排版原则

1. **大字紧、小字松**：大标题使用明显负字距，小字趋于正常。
2. **主层级靠字重和密度，不靠颜色轰炸**。
3. **正文始终比 UI 文本更像正文**：避免所有文字都像 label。
4. **同一页面内，标题层级不宜过多**：最好控制在 2–3 层。
5. **浅色主题尤其需要控制灰度文本数量**：文本一多就会“发灰”。

---

## 4. 组件样式规则

### 4.1 按钮

#### Ghost Button（默认幽灵按钮）
- Background: `transparent`
- Text: `#3b4048`
- Border: `1px solid #e1e5ea`
- Radius: `6px`
- Hover: `#f3f4f5`
- Active: `#eceff3`
- Focus Ring: `0 0 0 3px rgba(94,106,210,0.14)`

适用：
- 常规次级操作
- 工具栏按钮
- 不应抢占主视觉的按钮

#### Subtle Button（轻底按钮）
- Background: `#f5f6f7`
- Text: `#3b4048`
- Border: `1px solid #e8ebef`
- Radius: `6px`
- Hover: `#eef1f4`
- Active: `#e9edf2`

适用：
- 工具操作
- 辅助筛选
- 场景内轻交互

#### Primary Brand Button（主品牌按钮）
- Background: `#5e6ad2`
- Text: `#ffffff`
- Border: `1px solid transparent`
- Radius: `6px`
- Hover: `#7170ff`
- Active: `#5562c4`
- Focus Ring: `0 0 0 3px rgba(94,106,210,0.18)`

适用：
- 单区块唯一主 CTA
- 关键确认操作
- 页面焦点操作

规则：
- 一个局部区域尽量只出现一个主品牌按钮。
- 不要把所有按钮都做成品牌色。

#### Icon Button
- Background: `transparent` 或 `#f5f6f7`
- Text/Icon: `#4c5159`
- Border: `1px solid #e8ebef`
- Radius: `9999px` 或 `6px`
- Hover: `#eef1f4`

适用：
- 更多菜单
- 关闭、展开、收起
- 行内操作

#### Pill Button / Filter Chip
- Background: `transparent`
- Text: `#4c5159`
- Border: `1px solid #dfe4ea`
- Padding: `0 10px`
- Radius: `9999px`
- Hover: `#f3f4f5`
- Selected Background: `#eef0ff`
- Selected Text: `#4f5ccf`
- Selected Border: `#d9ddff`

### 4.2 卡片与容器

#### Standard Card
- Background: `#ffffff`
- Border: `1px solid #e1e5ea`
- Radius: `8px`
- Shadow: `0 1px 2px rgba(16,24,40,0.04)`
- Hover: 边框略清晰或背景极轻变化，不依赖重阴影

#### Panel
- Background: `#f5f6f7`
- Border: `1px solid #e8ebef`
- Radius: `12px`
- Shadow: none 或极轻

#### Floating Surface / Popover / Dropdown
- Background: `#ffffff`
- Border: `1px solid #dfe4ea`
- Radius: `10px`–`12px`
- Shadow: `0 8px 24px rgba(16,24,40,0.08), 0 2px 6px rgba(16,24,40,0.04)`

规则：
- 浅色 Linear 风格下，卡片不是“到处都飞”。
- 大多数内容面只需要白底 + 轻边框 + 极轻阴影。
- 只有真正悬浮的层才需要更明显的 shadow。

### 4.3 输入与表单

#### Text Input
- Background: `#ffffff`
- Text: `#222326`
- Placeholder: `#8b93a1`
- Border: `1px solid #d0d6e0`
- Radius: `6px`
- Padding: `10px 12px`
- Hover: Border 稍微增强
- Focus: `border-color: #5e6ad2` + soft ring

#### Text Area
- Background: `#ffffff`
- Border: `1px solid #d0d6e0`
- Radius: `6px`
- Padding: `12px 14px`
- Text: `#222326`
- Placeholder: `#8b93a1`

#### Search Input
- Background: `#f5f6f7`
- Border: `1px solid #e8ebef`
- Text: `#222326`
- Placeholder: `#9098a4`
- Leading Icon: `#9098a4`

规则：
- 输入框优先做“稳定、安静、清晰”，不要做过度渐变或过度内阴影。
- 聚焦态依然要克制，避免荧光感的高饱和蓝 outline。

### 4.4 标签、Badge 与状态 Pill

#### Neutral Badge
- Background: `#f5f6f7`
- Text: `#4c5159`
- Border: `1px solid #e8ebef`
- Radius: `9999px`
- Font: `12px / 510`

#### Accent Badge
- Background: `#eef0ff`
- Text: `#4f5ccf`
- Border: `1px solid #d9ddff`

#### Success Badge
- Background: `#ecf8ef`
- Text: `#1f8a38`
- Border: `1px solid #cdebd4`

#### Warning Badge
- Background: `#fff7e8`
- Text: `#8c6419`
- Border: `1px solid #f4dfb4`

#### Danger Badge
- Background: `#fff1f1`
- Text: `#b83737`
- Border: `1px solid #f3caca`

规则：
- Badge 是信息密度组件，不是视觉主角。
- 浅底状态 badge 优先于纯色 badge。

### 4.5 导航

#### Top Navigation / Header
- Background: `rgba(247,248,248,0.82)` 或 `rgba(255,255,255,0.82)`
- Backdrop Blur: `12px`–`20px`
- Bottom Border: `1px solid #e8ebef`
- Text: `#4c5159`
- Active Text: `#222326`
- CTA: 品牌按钮或浅色 subtle button

#### Sidebar
- Background: `#f5f6f7`
- Border Right: `1px solid #e8ebef`
- Group Label: `12px / 510 / #8b93a1`
- Item Text: `14px–15px / 510 / #4c5159`
- Item Hover: `#eef1f4`
- Item Active Background: `#ffffff`
- Item Active Border: `1px solid #e8ebef`
- Item Active Text: `#222326`

规则：
- 导航层的风格不应该比内容更重。
- active 主要通过背景、文字和轻边界表达，不靠高饱和纯色块。

### 4.6 表格与列表

#### Row
- Background: `transparent`
- Hover: `#f5f6f7`
- Selected: `#eef0ff` 或 `#f2f5ff`
- Divider: `#eceff3`

#### Table Header
- Background: `#f7f8f8` 或 `#f5f6f7`
- Text: `#6b7280`
- Font: `12px / 510`
- Border Bottom: `1px solid #e8ebef`

规则：
- 表格的可读性优先于装饰感。
- 不要使用强对比斑马纹，优先用 hover / selected / hairline 建立秩序。

---

## 5. 布局原则

### 5.1 间距系统

- Base Unit: `8px`
- 常用间距：`4, 8, 12, 16, 20, 24, 32, 40, 48`
- 允许光学修正：`6, 10, 14, 18, 22`

原则：
- 主要布局遵循 8px rhythm。
- 小尺寸密集 UI 可允许 1–2px 的光学校正，但不要把系统做碎。

### 5.2 网格与容器

- **Max Content Width**：`1200px` 左右
- **Page Padding**：桌面 `24px–32px`，移动端 `16px`
- **面板布局**：sidebar + content + optional inspector
- **内容区域**：优先使用连续面而不是堆很多孤立卡片

### 5.3 留白哲学

浅色主题下，留白不是“空”，而是**弱背景与结构秩序的组合**。

建议：
- 使用浅灰白画布作为大背景
- 使用更白的内容面收敛注意力
- 用间距与对齐让模块呼吸，而不是靠很多描边划格子

### 5.4 圆角系统

- `2px`：极小标签、微型元素
- `4px`：紧凑列表项、小型容器
- `6px`：按钮、输入框、常规 UI 元素
- `8px`：标准卡片、菜单
- `10px`–`12px`：弹层、面板、模块容器
- `9999px`：pill / chip / status

规则：
- Linear 风格圆角偏克制，不是大面积软萌圆角。
- 不要全局动不动上 16 / 20 / 24px。

---

## 6. 层级与深度系统

浅色主题中的层级不来自“更重的阴影”，而来自四件事的共同作用：

1. 页面背景与内容表面的亮度差
2. 1px 边框或 hairline 细线
3. 控制良好的局部阴影
4. 文本与交互密度的层级

### 深度等级

| Level | 处理方式 | 用途 |
|---|---|---|
| Level 0 | `#f7f8f8` 页面底 | 最外层画布 |
| Level 1 | `#f5f6f7` + 轻边框 | 次级区域、侧栏、工具层 |
| Level 2 | `#ffffff` + `#e1e5ea` | 卡片、输入、主要内容面 |
| Level 3 | `#ffffff` + 清晰边框 + 轻阴影 | dropdown、popover、浮层 |
| Level 4 | `#ffffff` + 明显但克制的投影 | modal、command palette、主弹层 |
| Focus | 品牌色 soft ring + 边框增强 | 键盘焦点、表单聚焦 |

### 阴影建议

#### 微阴影
- `0 1px 2px rgba(16,24,40,0.04)`

#### 标准浮层阴影
- `0 8px 24px rgba(16,24,40,0.08), 0 2px 6px rgba(16,24,40,0.04)`

#### 强调浮层阴影
- `0 16px 40px rgba(16,24,40,0.10), 0 4px 12px rgba(16,24,40,0.06)`

规则：
- 阴影应服务于层级识别，而不是制造戏剧性。
- 页面内的大多数元素不需要“投影感”。
- 边框在浅色主题中比阴影更重要。

---

## 7. Do / Don’t

### Do
- 使用 `Inter Variable` 并启用 `"cv01", "ss03"`
- 使用 `510` 作为默认 UI 强调字重
- 使用 `#f7f8f8` 或接近它的浅灰白作为页面底
- 将 `#ffffff` 保留给卡片、输入面、弹层等主要内容层
- 用 `1px` 轻边框建立结构
- 用很轻的灰阶变化表示 hover / active
- 将品牌色集中用于 CTA、选中态、focus、链接
- 用排版和间距建立秩序，而不是靠装饰组件堆满界面
- 保持灰度系统低饱和、冷静、稳定

### Don’t
- 不要把整个页面铺成纯白 `#ffffff`
- 不要把所有按钮都做成品牌色按钮
- 不要用重投影制造到处悬浮的感觉
- 不要把 hover 做成明显变蓝或高饱和高亮
- 不要让边框太深、太粗、太暖
- 不要让文本层级全部挤在相近灰度里
- 不要滥用大圆角和拟物式层叠
- 不要把状态色当成装饰色四处点缀
- 不要让浅色主题看起来像“普通企业后台模板”

---

## 8. 响应式行为

### 断点建议

| 名称 | 宽度 | 变化 |
|---|---:|---|
| Mobile Small | `<600px` | 单列、紧凑间距 |
| Mobile | `600–640px` | 保持单列，简化边栏 |
| Tablet | `640–768px` | 局部双列 |
| Desktop Small | `768–1024px` | 展开主要布局 |
| Desktop | `1024–1280px` | 标准桌面布局 |
| Large Desktop | `>1280px` | 更宽松的留白与边距 |

### 响应式原则

1. 大标题按比例缩小，但仍保持较紧字距。
2. 导航从横向分布转为折叠或抽屉时，视觉语言不变。
3. 卡片与表格优先做信息折叠，不要简单压扁。
4. 边界、表面和排版系统在不同尺寸下应保持一致。
5. 浅色主题在小屏上尤其容易“发空”，因此移动端更需要依靠密度与结构维持节奏。

---

## 9. 面向 AI / 设计生成的 Prompt 指南

### 9.1 快速色值参考

- Page Background: `#f7f8f8`
- Alt Page Background: `#f4f5f8`
- Surface: `#ffffff`
- Secondary Surface: `#f5f6f7`
- Hover Surface: `#eef1f4`
- Primary Text: `#222326`
- Secondary Text: `#4c5159`
- Muted Text: `#6b7280`
- Subtle Text: `#8b93a1`
- Border: `#d0d6e0`
- Border Subtle: `#e8ebef`
- Brand: `#5e6ad2`
- Accent: `#7170ff`
- Accent Soft Background: `#eef0ff`
- Accent Soft Border: `#d9ddff`
- Success Soft: `#ecf8ef`
- Danger Soft: `#fff1f1`

### 9.2 组件生成 Prompt 示例

#### 页面框架
- 设计一个 Linear 风格浅色页面。页面背景使用 `#f7f8f8`，主内容区使用 `#ffffff` 卡片面，边框为 `1px solid #e1e5ea`，整体风格克制、安静、低饱和。所有文字使用 Inter Variable，并启用 `font-feature-settings: "cv01", "ss03"`。

#### 主按钮 + 次按钮
- 生成一组 Linear 风格浅色按钮：主按钮使用 `#5e6ad2` 背景、白色文字、6px 圆角；次按钮使用透明或 `#f5f6f7` 浅底、`#3b4048` 文字、`#e1e5ea` 边框。hover 只做轻微灰阶变化，不做高饱和高亮。

#### 卡片
- 生成一张浅色 Linear 风格卡片：白色表面 `#ffffff`，边框 `#e1e5ea`，圆角 8px，极轻阴影 `0 1px 2px rgba(16,24,40,0.04)`。标题使用 20px Inter Variable、590 字重，正文 15–16px，正文灰度低于标题但仍保持清晰可读。

#### 表单
- 生成一组浅色 Linear 风格表单输入框：输入面为 `#ffffff`，边框 `#d0d6e0`，聚焦态使用 `#5e6ad2` 边框和柔和 focus ring，不使用荧光蓝 outline。placeholder 使用 `#8b93a1`。

#### 侧边栏
- 生成一个 Linear 风格浅色 sidebar：背景 `#f5f6f7`，右侧边框 `#e8ebef`，导航文字为 `#4c5159`，当前项使用白色背景 + 轻边框 + 更深文字。整体不要使用大面积品牌色高亮。

### 9.3 AI 生成约束

1. 所有界面优先遵循**浅灰白画布 + 白色内容面 + 轻边框 + 极轻阴影**。
2. 品牌色只允许出现在 CTA、focus、selected、link、少量标签中。
3. 不允许引入额外高饱和装饰色作为系统主色。
4. 不允许使用过于夸张的阴影、玻璃拟态或大面积渐变作为基础风格。
5. 不允许把所有元素都做成卡片悬浮样式。
6. 文字层级必须依赖字号、字重、间距与色阶共同建立。
7. 所有组件默认圆角应保持克制，优先使用 6px / 8px / 12px。
8. 生成结果必须更像“精密产品界面”，而不是“装饰型营销 UI”。

---

## 10. 推荐落地方式（工程侧）

建议把主题抽象为以下 token 层：

### Base Tokens
- `color.page`
- `color.surface`
- `color.surfaceSecondary`
- `color.border`
- `color.textPrimary`
- `color.textSecondary`
- `color.textTertiary`
- `color.brand`
- `color.accent`
- `shadow.sm`
- `shadow.md`
- `radius.sm`
- `radius.md`
- `radius.lg`

### Semantic Tokens
- `button.primary.bg`
- `button.primary.text`
- `button.ghost.border`
- `input.bg`
- `input.border`
- `card.bg`
- `card.border`
- `nav.item.activeBg`
- `badge.success.bg`
- `badge.success.text`

### Component Tokens
- `sidebar.item.activeBackground`
- `commandPalette.background`
- `table.row.hoverBackground`
- `popover.shadow`

规则：
- 不要直接在业务组件里写颜色。
- 先固化语义 token，再做组件 token，最后才是具体实现。

---

## 11. 一句话总结

这套 Linear 浅色风格的核心，不是“把界面做白”，而是：

**用低饱和浅灰白作为画布，用白色内容面聚焦信息，用轻边界和极轻阴影建立层级，用 Inter Variable 的排版密度塑造秩序，用极少量品牌色完成交互强调。**

当你不知道该怎么设计时，优先做这五件事：

1. 降低背景饱和度
2. 减少无意义色彩
3. 提高清晰度而不是戏剧性
4. 用排版而不是装饰做层级
5. 让品牌色只在真正重要的地方出现

