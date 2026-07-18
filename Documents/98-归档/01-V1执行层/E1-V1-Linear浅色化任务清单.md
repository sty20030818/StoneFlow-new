# E1 · V1 · Linear 浅色化任务清单

> 最后更新：2026-04-23 · 当前状态：Linear 浅色化执行清单已完成

## 文档目标

本文件用于记录 StoneFlow `V1` 当前“Linear 浅色风格全项目统一化”剩余任务，不重复描述产品范围，只关注视觉系统落地、页面覆盖、状态统一与最终验收。

说明：

- 本文档是执行清单，不替代 [E1-V1执行文档.md](/Docs/执行层/E1-V1执行文档.md)
- 本文档默认基于“先完成浅色主题完整统一，再决定深色主题策略”的当前共识推进
- 本文档聚焦前端视觉与交互表现，不扩展业务能力和数据结构

---

## 当前结论

当前已经完成的是“Linear 浅色风格第一个小闭环”，但还没有完成“整个项目全量 Linear 化”。

可以这样理解当前状态：

- 已完成：设计 token 基线、shadcn 基础组件浅色化、Shell 主骨架、Inbox / Focus / Project / Quick Capture / Global Search / Drawer / 创建弹窗等高频路径的第一轮统一
- 未完成：剩余页面补齐、状态块清洗、视觉细节收口、逐页验收、文档归档

当前粗略完成度判断：

- 可用层面：`70% ~ 80%`
- 一致性与封版层面：`55% ~ 65%`

---

## 已完成范围

以下内容已基本进入统一体系：

- [x] 全局浅色 token 与基础语义变量
- [x] shadcn 基础组件第一轮 Linear 化
- [x] Shell Header / Sidebar / Main 主框架
- [x] Inbox 页面第一轮统一
- [x] Focus 页面第一轮统一
- [x] Project 页面第一轮统一
- [x] Quick Capture 浮层第一轮统一
- [x] Global Search 第一轮统一
- [x] Task Drawer 内容区第一轮统一
- [x] Task / Project 创建弹窗第一轮统一

---

## 剩余任务总览

### P0 · 主路由全覆盖

这一阶段的目标是确保所有核心页面都已经进入同一套浅色设计系统，不再出现明显“旧风格残留页”。

- [x] 完整 Linear 化 `TrashPage`
  - [x] 去掉明显旧风格 `rounded-xl`
  - [x] 去掉明显旧风格 `emerald / destructive` 直出语义
  - [x] 去掉明显旧风格 `bg-background` 主导写法
  - [x] 统一为空态、结果态、恢复动作、批量区块的 Linear 轻边框与浅底逻辑
- [x] 复查所有主路由页的标题区节奏
  - [x] 标题字号、说明文字、分组标题密度统一
  - [x] 操作区按钮尺寸、间距、图标权重统一
- [x] 复查 Shell 残留碎片
  - [x] `ShellDrawer` 的详情块、分组块、操作块统一
  - [x] `ShellFooter` 如仍存在旧 token 痕迹，统一为当前浅色系统

完成标志：

- 所有核心路由页面首屏都不再出现明显不同代际的样式语言
- 用户在 `Inbox / Focus / Project / Trash` 之间切换时，感知到的是同一产品而不是拼接页

---

### P0 · 状态块统一清洗

这一阶段的目标是消灭“看起来已经差不多，但细节一眼看出不属于同一系统”的散点样式。

- [x] 搜索并统一以下高频残留样式
  - [x] `rounded-xl`
  - [x] `bg-background`
  - [x] `bg-background/80`
  - [x] `border-border/70`
  - [x] `border-emerald*`
  - [x] `border-destructive*`
- [x] 统一状态反馈语义
  - [x] success 改为 soft success，而不是高饱和绿块
  - [x] danger 改为 soft danger，而不是大面积红底
  - [x] selected / active / hover / disabled 四类状态回到统一 token
- [x] 统一空态 / 错误态 / 成功态容器
  - [x] 边框粗细统一
  - [x] 圆角统一到 `md / lg` 区间
  - [x] 文案层级、图标尺寸、按钮位置统一

完成标志：

- 全项目高频状态块不再依赖零散颜色类名临时拼接
- 所有状态容器均能映射到统一的中性底色 + 轻边框 + 局部强调体系

---

### P1 · 高频浮层与表单收口

这一阶段的目标是把用户最常交互的浮层、弹窗、表单区完全收进同一节奏，不让体验停留在“表面统一”。

- [x] 复查 `TaskCreate` 弹窗
  - [x] 标题、说明、表单字段、底部动作区节奏统一
  - [x] 输入、选择器、标签、错误提示统一
- [x] 复查 `ProjectCreate` 弹窗
  - [x] 与 `TaskCreate` 保持同级别壳层密度
- [x] 复查 `TaskDrawer`
  - [x] 分区标题、说明文字、字段组、操作区视觉层级统一
  - [x] 信息密度既保持紧凑，也不显拥挤
- [x] 复查 `GlobalSearch`
  - [x] 搜索输入区、分组标题、结果项 hover / active / selected 状态统一
  - [x] 空结果与最近项视觉节奏统一
- [x] 复查 `QuickCapture`
  - [x] 结果项高度、行内信息层级、底部辅助区统一
  - [x] 优先级、项目候选项、快捷提示不再出现旧风格 chip
- [x] 复查基础组件最终一致性
  - [x] `dropdown-menu`
  - [x] `select`
  - [x] `tooltip`
  - [x] `badge`
  - [x] `tabs`
  - [x] `command`

完成标志：

- 用户在“搜索 / 创建 / 编辑 / 快速捕获”四类高频浮层之间切换时，交互密度和视觉语法一致
- 所有输入类组件的聚焦、选中、禁用、错误反馈已经统一

---

### P1 · 页面级视觉收口

这一阶段不是改大结构，而是把“已经能用”的界面打磨到“可以封版”的程度。

- [x] 统一页面标题区的垂直节奏
- [x] 统一列表项、卡片项、信息块的圆角与内边距
- [x] 统一分组标题、辅助说明、计数信息的字重与颜色层级
- [x] 统一按钮系统
  - [x] 主按钮
  - [x] 次按钮
  - [x] ghost 按钮
  - [x] icon-only 按钮
- [x] 统一列表行状态
  - [x] 默认态
  - [x] hover
  - [x] active
  - [x] selected
  - [x] done
  - [x] disabled
- [x] 统一轻分隔线、面板阴影、浅底块使用边界
- [x] 检查文案长度与布局稳定性，避免按钮、标签、标题换行后破坏视觉节奏

完成标志：

- 页面之间的差异主要来自信息内容，而不是控件节奏和视觉体系差异
- 达到“截图放在一起看，像同一次设计产物”的程度

---

### P2 · 系统化验收与治理

这一阶段的目标是把“做完”变成“可交付、可复查、可继续维护”。

- [x] 逐页视觉验收
  - [x] Inbox
  - [x] Focus
  - [x] Project
  - [x] Trash
  - [x] Global Search
  - [x] Quick Capture
  - [x] Drawer
  - [x] Create Dialog
- [x] 交互状态验收
  - [x] hover / focus / active / selected / disabled
  - [x] 空态 / 错误态 / 成功态
- [x] Tauri 壳层专项验收
  - [x] 无边框窗口拖拽区不被破坏
  - [x] Windows 标题栏按钮平台例外保持合理
  - [x] overlay 层级与遮罩表现正常
- [x] 工程校验
  - [x] `bun run build`
  - [x] `bun run format:check`
  - [x] `bun run test:run`
  - [x] `bun run lint`
- [x] 文档归档
  - [x] 将最终设计结论回写到执行文档或验收记录
  - [x] 明确深色主题是“后续单独设计”还是“沿用现状暂不治理”

完成标志：

- 视觉统一不只停留在开发感觉，而是经过逐页与逐状态检查
- 后续继续做功能时，有明确的设计边界和验收基线可依赖

---

## 推荐执行顺序

建议按以下顺序推进：

1. 继续做全局状态块统一清洗
2. 然后复查 `TaskCreate / ProjectCreate / TaskDrawer / GlobalSearch / QuickCapture`
3. 再做页面级密度与状态收口
4. 最后做一次系统化验收与文档归档

原因很简单：

- `TrashPage` 已经补齐，下一步就该清理跨页面散点样式
- 状态块清洗会影响很多页面，越早做越能减少后面返工
- 高频浮层是用户频繁感知的一层，值得在主页面统一后马上收口

---

## 不纳入本轮的事项

以下内容不建议混入这轮 Linear 浅色化任务：

- [ ] 深色主题完整重做
- [ ] 业务逻辑重构
- [ ] 大规模组件抽象治理
- [ ] 新功能扩展
- [ ] 为视觉统一而修改数据模型或接口

这些事项会显著扩大工作面，削弱本轮“统一现有产品外观与交互语法”的目标。

---

## 一句话执行结论

当前不是从零开始做 Linear，而是已经完成了第一段闭环；接下来真正要做的是：补齐 `Trash`、清洗散点状态样式、收口高频浮层、做逐页验收，直到整个 V1 前端浅色界面形成同一套 Linear 语言。

---

## 本轮新增进展

- [x] 抽出共享 `StatusNotice`，统一 `success / warning / danger / neutral` 软状态块
- [x] 抽出共享 `linearSurface` 卡片语义，统一列表行与信息块的圆角、边框、active / done 状态
- [x] 收口 `Inbox / Focus / Project / Trash / ShellSidebar / ListItem`
- [x] 收口 `TaskCreate / ProjectCreate / TaskDrawer` 的状态反馈容器
- [x] 清理测试中的 `vi.fn()` 类型 warning，恢复 `lint` 零 warning
- [x] 完成 `bun run format:check`
- [x] 完成 `bun run build`
- [x] 完成 `bun run test:run`
- [x] 完成 `bun run lint`
- [x] 新增 [E1-V1-Linear浅色化验收记录.md](/Docs/执行层/E1-V1-Linear浅色化验收记录.md)
- [x] 逐页视觉、交互状态、Tauri 壳层专项验收全部完成
- [x] 统一 `ProjectPage / ShellSidebar / Command` 的状态 badge 语义，已完成改为 soft success，`active / paused` 回到 primary / warning
- [x] 统一 `ShellDrawer` 详情 badge 语义，项目详情中的 `Active` 改为主题色 primary，类型标签回到 secondary
