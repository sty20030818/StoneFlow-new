# 05 — 日期选择迁移至 HeroUI Calendar

**What to build:** 让 Launcher 和全局自定义日期流程在各自已有的 Popover 或 Modal 中使用 HeroUI Calendar，并通过唯一共享适配器保持 StoneFlow 的 `YYYY-MM-DD` 日期含义、预设和提交语义不变。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] HeroUI Calendar 被放入两个既有产品 overlay，不再使用原生日期输入，也不嵌套第二层 DatePicker Popover。
- [ ] Launcher 保留今天、明天、本周、清除和自定义日期入口；Calendar 选择继续立即更新 Launcher 草稿。
- [ ] 全局自定义日期 Modal 保留既有值回显、保存、取消、移除、Escape 和焦点恢复行为；选择日期只更新 Modal 草稿，保存按钮仍是提交边界。
- [ ] 两个消费者共用唯一 Date view adapter，HeroUI DateValue 离开适配边界后立即转换为 `YYYY-MM-DD`，不进行时区转换。
- [ ] 适配器对空值、普通日期、月末、闰日、非法格式和双向 round trip 都有确定行为。
- [ ] `@internationalized/date` 作为业务源码直接使用的依赖显式声明，并与当前锁定的 HeroUI 版本兼容。
- [ ] Command、ContextMenu 和任务详情继续进入同一个全局日期流程，领域类型、Tauri DTO 和持久化契约不变。
- [ ] Launcher、全局 Overlay 与纯适配器测试覆盖关键行为，相关测试与根级前端门禁通过；真实 Overlay 定位与 WebView 焦点恢复保留为 Tauri 验收项。
