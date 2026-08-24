# 03 — 建立 Saved View Library 并删除旧双轨

**What to build:** `/views` 根页只负责 Saved View 库管理，`/views/:viewId` 使用统一 Task Workspace；删除 System View 伪实体、独立 ViewsPage 结果 scene、旧状态全量 pills 和零消费兼容代码。

**Blocked by:** 02 — Task Workspace 与 Default View 矩阵已可用

**Status:** completed; archived; manual acceptance transferred

- [x] `/views` 根页只展示当前 scope 的 Saved View 库，提供搜索、创建、重命名、删除和打开；不渲染 TaskBoard、FilterBar 或任务状态 Default View。
- [x] `/views/:viewId` 保留 canonical 路径，后端验证 View 属于当前 scope，并将 saved-view source 交给 Task Workspace；未增加 `/tasks?view=` 兼容路由。
- [x] 复用现有 Saved View 表单/领域操作，不为 Library 创建第二套 CRUD 或一对一 wrapper。
- [x] 删除前端 `SYSTEM_VIEWS`、`kind=system`、`SystemViewKey`、系统/自定义 View 合并列表和相关 adapter；Default View 只由页面策略定义。
- [x] 删除独立 ViewsPage 任务结果编排、重复 scene 与重复保存流程；Saved View Library 和 Task Workspace 各自只有一个职责。
- [x] 删除所有页面为每个 Task status 生成的旧 Toolbar 快捷配置，只保留 spec 矩阵。
- [x] Command 只保留必要的 PageFilter 最小投影；删除重复 Filter UI event、`showCompleted` 投影和已无消费者的 public exports。
- [x] 以 zero-consumer 证据删除旧实现细节测试，保留并收敛产品行为、键盘、焦点、可访问性、路由、存储升级边界和已发生回归测试。
- [x] 更新受影响 Feature `ARCHITECTURE.md` 和本地任务记录，确保产品、领域、系统、界面和实现术语一致；未建立平行 ADR/CONTEXT。

## Verification

- 路由/DOM 测试证明 `/views` 无 TaskBoard，`/views/:viewId` 复用 Task Workspace，并覆盖 scope 不匹配与 View 不存在。
- Library 行为测试覆盖搜索、创建、重命名、删除、打开与空态，断言公开行为而非 HeroUI 内部 DOM/class。
- `rg`/边界门禁证明 `SYSTEM_VIEWS`、`SystemViewKey`、旧 ViewsPage 结果 scene、重复 Filter event 与已登记兼容出口零消费且已删除。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run test:run`、`bun run test:rust`、`bun run build`。
- 真实 Tauri Smoke 已移入 [统一产品验收](../../../unified-product-acceptance/spec.md)；本工作包未执行该步骤，不宣称性能或视觉验收通过。
