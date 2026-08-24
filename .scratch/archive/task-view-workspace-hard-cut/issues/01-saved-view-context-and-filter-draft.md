# 01 — 让 Saved View 完整复现查询上下文

**What to build:** Saved View 持久化 `scope + context(all | standalone | projectId) + baseViewKey + filters`，Filter Draft 可准确表达相对 base 的任意完整 FilterQuery，使从 All Tasks、Standalone 或 Project 保存的查询都能精确重现。

**Blocked by:** None — can start immediately

**Status:** completed; archived; manual acceptance transferred

- [x] 在前端、application DTO、既有 storage row JSON 包络和同步投影中建立同一 Saved View context 判别联合：`all | standalone | projectId`，并保存 baseViewKey。
- [x] 把 context 作为不可移除的查询边界，不编码成 FilterQuery clause，不新增 origin/page metadata。
- [x] 旧 Saved View 只在单一存储解码边界升级为 `context=all + baseViewKey=all`；可无损表达的条件精确转换，不可表达的旧日期条件标记为“需要重建”，仍可单独删除但不可编辑或执行，且不拖垮列表；产品 DTO、运行分支和写路径不保留旧双轨。
- [x] 新建 Saved View 时保存当前 scope、context、baseViewKey 和 effective filters；覆盖 Saved View 时更新 filters 并保留其余边界。
- [x] 将 Filter Draft 定义为完整 FilterQuery 快照，以规范化后的 draft/base 相等性计算 dirty，而不是以 Draft 是否为空判断。
- [x] 路由可区分“无 Draft”与“空 FilterQuery Draft”；空 Draft 能临时覆盖非空 base，刷新可恢复。
- [x] FilterBar 仅在 `draft != base` 时显示；clean Default/Saved View 不显示 base chips、Clear 或 Save bar，恢复动作只删除 Draft。
- [x] 移除 `showCompleted` 对查询成员资格的参与；未完成/已完成/全部只通过 Default/Saved/Draft 查询表达，Display 仅负责呈现。
- [x] 将 Standalone/Project Saved View 重开核对移入 [统一产品验收](../../../unified-product-acceptance/spec.md)；本工作包未执行该真实应用步骤。

## Verification

- 纯函数测试：context 解析/校验、draft/base 语义相等、空 Draft 与无 Draft。
- DOM 行为测试：clean FilterBar 隐藏、首次修改出现、恢复后消失、刷新恢复 Draft。
- Rust 测试：存储升级边界、Saved View 定义/run、scope/context/baseViewKey 一致性。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、受影响前端测试、`bun run test:rust`。
