# 07 — 默认 Space 迁移至 HeroUI Pro CellSelect

**What to build:** 让用户在设置页通过 HeroUI Pro CellSelect 选择默认 Space，并继续以现有受控设置状态和后台结果处理成功、pending、失败回滚及空列表。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 默认 Space 设置项使用当前锁定版 HeroUI Pro CellSelect，当前值与选项保持受控。
- [ ] CellSelect 负责 setting-cell 结构、popover、键盘、focus、selected 和 disabled 语义，不复制 Select 内部皮肤。
- [ ] 选择新 Space 后沿用现有 mutation；成功采用 canonical 设置，失败恢复真实默认项并显示既有错误反馈。
- [ ] pending 状态避免重复提交，空 Space 列表拥有明确且可访问的禁用表现。
- [ ] 该单一消费者直接组合 CellSelect，不新增一对一 wrapper，也不保留 OSS Select fallback。
- [ ] 其他已经正确使用 HeroUI Select 的业务字段不受影响；只删除默认 Space 旧 Select 的零消费者代码。
- [ ] Settings 行为测试覆盖当前值、选择、pending、失败回滚和空列表，相关测试与根级前端门禁通过。
