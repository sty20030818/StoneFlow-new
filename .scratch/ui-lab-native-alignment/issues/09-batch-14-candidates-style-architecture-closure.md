# 09 — 完成第十四批替换候选与样式架构审查

**What to build:** 为五个明确候选建立 Current/Native 对照，并把相关 `components.css` recipe 家族映射到真实消费者、Owner 与处置结论；本 ticket 只形成未来迁移输入，不执行生产替换、CSS 删除或视觉修改。

**Blocked by:** 04 — 建立第九批 HeroUI OSS 原子与表单对照；05 — 建立第十批 HeroUI OSS/Pro 复杂控件对照；06 — 建立第十一批 StoneFlow 共享产品组件审查面；07 — 建立第十二批 Task 与集合组合审查面；08 — 建立第十三批 Shell、Settings、Launcher 与反馈场景。

**Status:** planned

**Primary write scope:** 新增一个第十四批 candidate/fixture 模块、catalog 注册入口、审查结论与必要的根级测试；`src/styles/theme.css`、`components.css`、`base.css`、`ARCHITECTURE.md` 只读审计。

- [ ] 第十四批包含五个明确候选：HoverCard → Task Preview、InlineSelect → Metadata、Autocomplete/ComboBox → 可搜索属性菜单、TagGroup → Labels、Segment → 简单单选视图切换。
- [ ] 每个候选记录真实目标与消费者、必须保持的视觉/行为合同、锁定版本能力、预期可删除项和验证边界。
- [ ] Current 与 Native Candidate 使用同一 fixture；不存在真实差异时不制造并排面板，锁定版本没有公共能力时不伪造组件或 API。
- [ ] 需要新增依赖或可选 peer 的候选只登记要求和成本，本 ticket 不安装依赖、不修改锁文件。
- [ ] 用户审查后每个候选收敛为 `Keep`、`Simplify` 或“需要在 Current/Native 中继续选择”；不得把自动化通过当作迁移批准。
- [ ] 每个 `Simplify` 指向具体生产消费者以及可删除的私有 DOM 依赖、重复状态、Focus/动画代码或 CSS 选择器；没有实质删减的候选保持 `Keep`。
- [ ] Upstream 与 Current 一致的条目只渲染一次并标记 `Upstream · 无覆盖`；相同视觉不为展示完整度复制 fixture。
- [ ] `components.css` 相关 recipe 家族均能关联真实消费者、当前 Owner 和处置；不因文件长度建立拆分任务，不把 `Simplify` 当成第五个 Owner。
- [ ] `base.css` 保持 Foundation Owner，`theme.css` 保持 Token Owner，产品 Module 保持结构/状态 Owner；隔离 baseline 不拥有生产视觉值。
- [ ] 本轮不拆 CSS 文件、不删除 recipe、不更新生产样式合同、不新增 wrapper、Provider、feature flag 或兼容双轨。
- [ ] 第十四批只有用户实际确认后才标记完成；待选择项必须在后续生产规格前得到明确结论。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- Ticket 03 建立的隔离 renderer 聚焦测试
- 人工检查五个候选的同 fixture 对照、Owner 与处置结论
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
