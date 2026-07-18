> 版本：v1
> 状态：待实施
> 目标：将 StoneFlow 当前样式体系重构为可长期维护的分层架构
> 适用范围：`/Users/sty/Desktop/StoneFlow-new`

---

## 1. 文档定位

本文档不是视觉设计稿，也不是 token 清单。

本文档只解决两件事：

1. 这次样式架构重构到底要改什么；
2. 应该按什么顺序改，才能在允许破坏性重构的前提下，把边界一次性改对。

配套文档：

- 长期规则文档：`src/styles/ARCHITECTURE.md`
- 历史方案文档：`Docs/stone_flow_样式架构重构完整方案.md`

本次采用的正式方向不是“继续在现有样式上修修补补”，而是：

> 建立 Foundation Base + Semantic Theme + Product Patterns 三层职责，收回页面层和基础组件层的越界样式责任。

---

## 2. 现状问题

当前仓库已经有较强的视觉方向，但样式责任分布不稳定，主要问题有四类。

### 2.1 `src/styles/index.css` 职责过载

当前 `src/styles/index.css` 同时承担：

1. Tailwind v4 入口；
2. 字体变量；
3. 原始色值；
4. 语义色值；
5. 布局变量；
6. shadcn token 映射；
7. 全局 reset；
8. 局部组件样式。

这会导致：

1. 任何样式改动都集中到一个 choke point；
2. token 分层无法真正建立；
3. 后续 AI 或开发者会继续往里面堆责任；
4. 很难判断某个变量到底属于 primitive、semantic、layout 还是一次性兼容代码。

### 2.2 `shared/ui/base` 已被产品语义污染

当前 `Button`、`Input`、`Select`、`DropdownMenu` 等基础组件已经承载了大量 StoneFlow 产品视觉决定，比如：

1. 主按钮 hover 色；
2. 主区图标按钮背景；
3. 特定 hover surface；
4. 统一圆按钮高度；
5. 菜单白底和局部直接色值。

这类信息如果继续堆在 base 层，会产生两个后果：

1. base 不再是基础组件层，而变成弱业务组件层；
2. 页面为了适配更多场景，会继续 `className` 覆写，形成双向污染。

### 2.3 页面层仍在直接定义核心视觉

当前页面和布局层里仍有大量：

1. 直接写 hex；
2. 直接写局部 hover/active 背景；
3. 直接写固定圆角、阴影、边框；
4. 直接在页面层拼“半成品 pattern”。

这意味着即使只重构 token，架构也会再次退化。

### 2.4 产品模式尚未正式独立

像下面这些东西，已经不是 shadcn primitive，而是 StoneFlow 产品模式：

1. Main Card 工具条 pill；
2. Main Card 图标按钮；
3. Window control 按钮；
4. Sidebar item；
5. Task row；
6. Command item；
7. 各类 shell action trigger。

它们应该进入产品模式层，而不是继续散落在页面和基础组件之间。

---

## 3. 本次重构目标

本次重构只追求一件事：

> 让样式责任稳定，之后新 UI 继续迭代时，不再需要反复争论“颜色写哪里、高度写哪里、这个该不该进 base”。

具体目标如下。

### 3.1 样式分层目标

正式建立以下分层：

```txt
Primitive Tokens
    ↓
Semantic Tokens
    ↓
Layout Tokens
    ↓
shadcn Compatibility Mapping
    ↓
Base Primitives
    ↓
Product Patterns
    ↓
Pages / Features / Layout Composition
```

### 3.2 责任收口目标

1. 颜色、边框、文本、surface、shadow、overlay 统一回收进 token。
2. 高度、圆角、横向 padding 等几何规则，大部分固化在 `shared/ui/base`。
3. `shared/ui/base` 不再承载业务语义。
4. 重复产品样式结构提炼到产品模式层。
5. 页面层不再定义核心视觉规则。

### 3.3 范围控制目标

本次不做：

1. 完整 dark theme；
2. 完整 design system 官网化整理；
3. 全仓库视觉改版；
4. token 工具链平台化；
5. Figma 同步体系。

本次只做前端代码架构真重构。

---

## 4. 目标落地结构

### 4.1 样式目录

目标目录：

```txt
src/styles/
├── index.css                  # 唯一入口，只负责 import 顺序
├── ARCHITECTURE.md            # 样式架构长期规则
├── tokens/
│   ├── primitive.css          # 原始值层
│   ├── semantic.css           # 通用语义层
│   ├── layout.css             # 布局语义层
│   └── dark.css               # 暗色占位骨架，先不补完整 dark
├── adapters/
│   └── shadcn.css             # shadcn token 映射 + Tailwind v4 暴露
├── base.css                   # reset / element base / global behavior
└── utilities.css              # 少量全局 utility
```

### 4.2 UI 层结构

目标职责：

```txt
src/shared/ui/
├── base/                      # 基础 primitive
├── patterns/                  # StoneFlow 产品模式
├── badgeSemantics.ts          # 纯语义映射可保留
└── ...
```

说明：

1. `base/` 负责基础组件几何与交互骨架；
2. `patterns/` 负责 StoneFlow 产品表达；
3. `app/layouts` 负责壳层结构；
4. `features/*/ui` 负责场景组合；
5. 页面不再定义可复用视觉模式。

---

## 5. 核心边界

### 5.1 Token 负责什么

token 负责：

1. 文本颜色；
2. surface 颜色；
3. 边框颜色；
4. 状态颜色；
5. shadow；
6. overlay；
7. shell/main/control 等布局语义颜色；
8. 少量必须跨组件复用的尺寸变量。

token 不负责：

1. 业务组件结构；
2. 页面一次性布局；
3. Button 是否圆角胶囊；
4. Input 默认高度是多少；
5. 某个页面专属动画。

### 5.2 Base 负责什么

`shared/ui/base` 负责：

1. primitive 交互；
2. 默认几何；
3. 默认内边距；
4. 默认 focus 行为；
5. overlay 基础动画；
6. 数据属性驱动的通用 size/variant。

`shared/ui/base` 不负责：

1. `sidebarActive` 这类业务 variant；
2. `taskDone` 这类业务状态；
3. `main-card-action` 这类产品模式；
4. `shell-header-window-control` 这类结构角色。

### 5.3 Product Pattern 负责什么

产品模式层负责：

1. 把多个 primitive 组合成可复用产品表达；
2. 承接产品语义 hover/selected/active；
3. 统一页面重复结构。

典型候选：

1. `MainCardToolbarPill`
2. `MainCardGhostAction`
3. `WindowControlButton`
4. `SidebarItem`
5. `ProjectTreeItem`
6. `TaskRow`
7. `CommandResultItem`
8. `QuickCapturePriorityChip`

---

## 6. 分阶段实施计划

本次按 8 个阶段推进。允许一次性大改，但不允许边改边失去边界。

### P0：落规则与目录骨架

目标：

1. 建立正式实施方案文档；
2. 建立 `src/styles/ARCHITECTURE.md`；
3. 创建目标样式目录骨架；
4. 保持运行入口仍为 `src/styles/index.css`。

产出：

1. `Docs/stone_flow_样式架构改造实施方案.md`
2. `src/styles/ARCHITECTURE.md`
3. `src/styles/tokens/*`
4. `src/styles/adapters/shadcn.css`
5. `src/styles/base.css`
6. `src/styles/utilities.css`

验收：

1. 后续任何改动都有正式规则可依；
2. 样式入口顺序被明确固定；
3. 新文件职责已经写清。

### P1：拆出 token 分层

目标：

把当前 `index.css` 里的变量拆成三层。

执行：

1. 从当前 `:root` 中抽出 primitive token。
2. 将 `--sf-color-bg-*`、`--sf-color-text-*` 这类按值命名的变量重命名为更稳定的 primitive/semantic 结构。
3. 建立 semantic token：
   - text
   - icon
   - surface
   - border
   - status
   - shadow
   - overlay
4. 建立 layout token：
   - shell
   - header
   - sidebar
   - footer
   - main
   - control
5. 只保留少量几何 token：
   - drawer width
   - shell sidebar width
   - 可跨层复用的 transition duration/easing

注意：

1. 不要把所有高度和圆角都 token 化。
2. 如果某个几何只在 base 内部使用，直接写死在 base。

验收：

1. token 文件能单独阅读；
2. 同一视觉语义只有一个来源；
3. 后续新增颜色不需要再碰 base 组件代码。

### P2：重建 shadcn 映射与 Tailwind v4 出口

目标：

让 shadcn token 成为兼容层，而不是产品语义真相源。

执行：

1. 在 `adapters/shadcn.css` 中完成：
   - `--background`
   - `--foreground`
   - `--card`
   - `--popover`
   - `--primary`
   - `--secondary`
   - `--muted`
   - `--accent`
   - `--border`
   - `--input`
   - `--ring`
2. 在 `@theme inline` 中只暴露必要 token。
3. 区分：
   - `bg-background` 是 shadcn 语境
   - `bg-sf-shell` / `bg-sf-main` 是 StoneFlow 产品语境

验收：

1. shadcn 基础组件不报废；
2. Tailwind utility 出口稳定；
3. 页面不需要再直接写 `text-(--var)` 才能工作。

### P3：清洗 `shared/ui/base`

目标：

把 base 从“产品污染层”清洗回“基础 primitive 层”。

执行：

1. 逐个检查：
   - `button.tsx`
   - `input.tsx`
   - `textarea.tsx`
   - `select.tsx`
   - `dropdown-menu.tsx`
   - `context-menu.tsx`
   - `dialog.tsx`
   - `sheet.tsx`
2. 清理内容：
   - 直接 hex
   - 产品语义变量名
   - 业务 variant
   - 页面专属 class 行为
3. 保留内容：
   - 默认高度
   - 默认圆角
   - 默认 padding
   - 默认 overlay radius/shadow/animation
   - 通用 outline/ghost/secondary/destructive/link
4. 对确实需要的个性化基础外观，用 semantic token 表达，不用产品命名表达。

验收：

1. base 可被其他场景复用；
2. base 不再知道 `main-icon-button`、`sidebar-action` 这类名字；
3. shadcn 升级差异面缩小。

### P4：建立产品模式层

目标：

把页面重复视觉模式从页面层收回。

执行：

1. 新建 `src/shared/ui/patterns/`。
2. 优先抽以下模式：
   - Main Card toolbar pill
   - Main Card ghost action
   - Window control button
   - Sidebar item
   - Task row 行容器
   - Command result item
3. Pattern 内可以使用：
   - `cva`
   - semantic token
   - layout token
   - base primitives
4. Pattern 内不允许：
   - feature 数据逻辑
   - route 判断
   - Tauri 调用

验收：

1. 页面内重复 class 显著下降；
2. 可复用视觉结构进入稳定位置；
3. base 与 page 之间多出清晰中间层。

### P5：回收页面层硬编码

目标：

清掉页面和布局中的核心视觉越界。

执行：

1. 优先改 `app/layouts/*`，因为它们是全局视觉壳。
2. 再改高频页面：
   - inbox
   - all-tasks
   - quick-capture
   - project-overview
   - task-drawer
3. 处理顺序：
   - 直接 hex
   - 直接写核心 hover/active
   - 重复工具条按钮
   - 重复容器卡片
   - 重复列表项
4. 不要求所有 className 消失。
5. 只要求页面层不再定义“可复用核心视觉规则”。

验收：

1. 页面层只保留组合和少量一次性布局；
2. 不再新增新的“伪 pattern”；
3. 样式修改时可以先判断归属，而不是到处找类名。

### P6：建立暗色骨架，但不补完整 dark

目标：

只为未来 dark 留稳定扩展口，不在本轮补全。

执行：

1. 新建 `tokens/dark.css`。
2. 只放：
   - `@custom-variant dark`
   - 最小 dark scaffold
   - 注释说明哪些 token 未来需要补
3. 不要求所有组件 dark 正常。

验收：

1. dark 扩展口存在；
2. 当前 light 架构不被 dark 拖复杂；
3. 后续补 dark 时不需要再改目录结构。

### P7：统一验收与回归

目标：

确保这次不是“文档整齐了，代码依然散”。

验收维度：

1. 架构验收
2. 代码验收
3. 视觉验收
4. 回归验收

架构验收：

1. `src/styles` 目录职责清晰；
2. `index.css` 只保留入口职责；
3. token 分层建立完成；
4. `base` 与 `patterns` 边界清晰。

代码验收：

1. 核心 base 组件不再包含产品命名变量；
2. 页面不再直接写核心视觉规则；
3. 产品模式层已接住主要重复结构。

视觉验收：

1. shell / header / sidebar / footer / main 层级不变；
2. 当前风格基调不被顺手改掉；
3. 关键 hover、selected、focus 不退化。

回归验收：

1. 主要页面可正常打开；
2. overlay 类组件不出现视觉异常；
3. shell header / sidebar / main card 不出现尺寸回归；
4. quick capture 不出现透明窗白边问题。

---

## 7. 文件级迁移顺序建议

实际落地时，不建议完全按目录机械推进，而应按影响面排序。

推荐顺序：

1. `src/styles/index.css`
2. `src/styles/tokens/*`
3. `src/styles/adapters/shadcn.css`
4. `src/styles/base.css`
5. `src/shared/ui/base/button.tsx`
6. `src/shared/ui/base/input.tsx`
7. `src/shared/ui/base/select.tsx`
8. `src/shared/ui/base/dropdown-menu.tsx`
9. `src/shared/ui/base/context-menu.tsx`
10. `src/shared/ui/base/dialog.tsx`
11. `src/shared/ui/base/sheet.tsx`
12. `src/shared/ui/patterns/*`
13. `src/app/layouts/shell/*`
14. `src/app/layouts/main-card/*`
15. 高频 features 页面

原因：

1. 先稳住真相源；
2. 再稳住 primitive；
3. 再回收产品模式；
4. 最后页面回填。

---

## 8. 实施约束

### 8.1 允许事项

1. 允许破坏性重命名 token；
2. 允许重写 base 样式实现；
3. 允许迁移页面调用方式；
4. 允许新增 `patterns` 层；
5. 允许批量替换局部 class 写法。

### 8.2 禁止事项

1. 为了兼容旧写法保留双套 token 真相源；
2. 为了少改代码把业务语义继续塞进 base；
3. 为了快，把 pattern 继续写回 page；
4. 引入新的临时色值；
5. 一边重构一边顺手改视觉方向；
6. 为 dark theme 提前加大量未使用 token。

---

## 9. 风险与控制

### 9.1 最大风险

最大风险不是功能坏，而是“新旧边界并存”。

如果出现下面这种情况，这次重构就算失败：

1. 新 token 层已经建好；
2. 旧页面 still 继续写硬编码；
3. base 里还保留产品语义；
4. page 里再长出新 pattern。

### 9.2 控制策略

1. 每改一层，就同步删掉旧来源；
2. 不保留双实现；
3. pattern 一旦抽出，原页面旧常量立即删除；
4. base 一旦清洗，页面必须改到位，不留半挂 class。

---

## 10. 最终验收标准

本次重构完成，必须同时满足：

1. `src/styles/index.css` 不再是大杂烩；
2. token 已分成 primitive / semantic / layout；
3. shadcn token 成为兼容层，不再是产品真相源；
4. `shared/ui/base` 只承载基础 primitive 职责；
5. `shared/ui/patterns` 接住主要产品表达；
6. `app/layouts` 和 `features/*/ui` 页面层不再定义核心视觉规则；
7. 当前 StoneFlow 风格基调仍保留；
8. dark 只留扩展骨架，不额外拖复杂度。

---

## 11. 一句话结论

这次改造的本质不是“把 CSS 文件拆开”，而是：

> 用 token 收回视觉真相，用 base 固化基础几何，用 patterns 承接产品表达，用页面回归组合职责。
