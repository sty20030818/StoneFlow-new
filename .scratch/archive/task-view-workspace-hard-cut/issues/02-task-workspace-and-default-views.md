# 02 — 统一 Task Workspace 与每页 Default View

**What to build:** All Tasks、Standalone、Project 与 Saved View 详情共用唯一 Task Workspace，每个页面只呈现已确认的 Default View 矩阵，Toggle 按下同一提交内立即选中。

**Blocked by:** 01 — Saved View context 与 Filter Draft 合同可用

**Status:** completed; archived; manual acceptance transferred

- [x] 建立唯一 Task Workspace 组合，集中拥有 PageFrame、Filter/Display 与 TaskBoard 插槽；页面 scene 只提供查询 source、集合结果、Default Views 和专属动作。
- [x] Default View 使用页面就近定义的稳定业务 key，不新建全局可配置注册表，不使用数组 index 作为选中身份。
- [x] All Tasks 严格使用：未完成 / 今天（含逾期）/ 即将到期 / 全部；默认未完成。
- [x] Standalone 严格使用：未完成 / 今天 / 全部；默认未完成。
- [x] Active Project 严格使用：未完成 / 今天 / 即将到期 / 已完成 / 全部；默认未完成。
- [x] Completed Project 严格使用：全部 / 已完成 / 未完成；默认全部。
- [x] Project Overview 严格使用：进行中 / 已完成 / 全部；默认进行中。
- [x] Archive/Trash 在 all scope 使用全部 / 空间 / 项目 / 任务，在 space scope 使用全部 / 项目 / 任务且不渲染“空间”；默认均为全部。
- [x] Saved View Detail 以当前 Saved View 为第一项与默认项，后续展示其 context 所属任务页的 Default Views；选择 Default View 时进入该页 canonical 结果。
- [x] Toggle Group 单选且不可清空，使用组级 selection change；短生命周期 interaction intent 在按下时立即反馈，canonical 回写或导航结束后收口，不重挂 DOM、不丢键盘焦点。
- [x] Default 与 Saved View 共用同一无损 Task 查询执行器；Saved 入口只负责加载定义和 scope 校验，storage 复用同一 SQL predicate，首屏执行 count + keyset 窗口、续页仅执行窗口，侧栏 badge 走 count-only；未重写 TaskBoard 虚拟几何。

## Verification

- 纯规则测试锁定八类页面/上下文的 Default View 名称、顺序和默认 key。
- DOM 测试在 click 的同一提交中断言新 Toggle 已选中，并断言不可空选、键盘和可访问名称。
- 路由/组合测试证明 `/tasks`、`/standalone`、`/projects/:id` 与 `/views/:viewId` 使用同一 Task Workspace 结果 Interface。
- 真实 Tauri 的 Default View 快速切换已移入 [统一产品验收](../../../unified-product-acceptance/spec.md)；本工作包未执行该步骤。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、受影响 DOM/单元测试、`bun run build`。
