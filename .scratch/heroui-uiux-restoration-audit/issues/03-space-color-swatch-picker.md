# 03 — Space 颜色迁移至 HeroUI ColorSwatchPicker

**What to build:** 让用户在新建和编辑 Space 时直接从现有五色 palette 中选择颜色，获得 HeroUI 提供的选择、键盘和可访问语义，同时继续只持久化既有 `colorKey`。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 新建和编辑 Space 共用同一组五个 HeroUI ColorSwatchPicker 选项。
- [ ] 每个色块都有可访问名称，可通过键盘选择，并由 HeroUI 表达 selected、focus 和 disabled 状态。
- [ ] Space Module 只有一份显式的 `colorKey`、中文名称与 CSS color value 对照，五个合法 key 均可无损双向映射。
- [ ] HeroUI Color 类型只存在于视图适配边界；表单提交、业务类型、Tauri DTO 和持久化仍只传递 `colorKey`。
- [ ] 已有 Space 的合法颜色重新打开后保持一致；未知持久化 key 使用既有视觉回退，但不能提交非法 palette 值。
- [ ] 旧颜色 Select、ListBox item、手写色点及只为旧展示存在的代码全部删除。
- [ ] SpaceEditor 行为测试覆盖 create/edit 默认值、五色选择、可访问名称、键盘操作和提交 payload，相关测试与根级前端门禁通过。
