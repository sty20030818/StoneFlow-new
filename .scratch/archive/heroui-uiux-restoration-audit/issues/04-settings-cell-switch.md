# 04 — 设置开关迁移至 HeroUI Pro CellSwitch

**What to build:** 让八个 Sidebar 设置项统一使用 HeroUI Pro CellSwitch，使整行点击、键盘切换、可访问名称和交互状态由 HeroUI 接管，同时保持现有偏好 mutation 与错误处理不变。

**Blocked by:** None — can start immediately.

**Status:** completed; archived; manual acceptance transferred

- [x] 八个设置开关均通过共享的 SettingsToggleRow 产品组合使用当前锁定版 CellSwitch。
- [x] 点击设置行、按标准键盘按键和直接操作 switch 都能触发同一个受控业务 mutation。
- [x] selected、disabled、focus、hover 和整行交互由 CellSwitch 原生结构负责，不复制 Switch thumb 或状态皮肤。
- [x] SettingsToggleRow 只承载多消费者共享的 label、description、selected、disabled 与 onChange 产品接口，不暴露供应商 slot 或维护第二份状态。
- [x] 八个设置项原有的成功、pending、失败反馈和持久化语义保持不变。
- [x] 旧 SettingCheckboxRow、旧 OSS Switch 路径以及只保护旧 DOM 结构的测试在消费者归零后删除，不保留 Pro fallback。
- [ ] Settings 行为测试覆盖整行点击、键盘、disabled 和八个业务 mutation，相关测试与根级前端门禁通过。
  - [x] DOM 自动化已覆盖公开 switch mutation、label 行结构、disabled、pending、失败反馈和八个设置项映射；相关自动化与根级前端门禁通过。
  - [ ] 真实整行点击与键盘激活已转入统一产品验收，尚未在 Tauri WebView 执行。
