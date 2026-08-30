# 09 — 完成第十四批替换候选与样式架构审查

**What to build:** 为五个明确候选建立 Current/Native 对照，并把相关 `components.css` recipe 家族映射到真实消费者、Owner 与处置结论；本 ticket 只形成未来迁移输入，不执行生产替换、CSS 删除或视觉修改。

**Blocked by:** 04 — 建立第九批 HeroUI OSS 原子与表单对照；05 — 建立第十批 HeroUI OSS/Pro 复杂控件对照；06 — 建立第十一批 StoneFlow 共享产品组件审查面；07 — 建立第十二批 Task 与集合组合审查面；08 — 建立第十三批 Shell、Settings、Launcher 与反馈场景。

**Status:** implemented — pending manual review

**Primary write scope:** 新增一个第十四批 candidate/fixture 模块、catalog 注册入口、审查结论与必要的根级测试；`src/styles/theme.css`、`components.css`、`base.css`、`ARCHITECTURE.md` 只读审计。

- [x] 第十四批包含五个明确候选：HoverCard → Task Preview、InlineSelect → Metadata、Autocomplete/ComboBox → 可搜索属性菜单、TagGroup → Labels、Segment → 简单单选视图切换。
- [x] 每个候选记录真实目标与消费者、必须保持的视觉/行为合同、锁定版本能力、预期可删除项和验证边界。
- [x] 可忠实渲染的 Current 与 Native Candidate 使用同一数据；Task Preview 不复制生产 DOM，明确转为真实应用边界。
- [x] 没有新增依赖或可选 peer，不修改锁文件。
- [ ] 用户审查后确认五项 `Keep` 推荐或提出继续选择；自动化不代签迁移批准。
- [x] 当前审计没有发现具备实质删减的 `Simplify`；五项均推荐 `Keep`，且没有预先登记 CSS 删除。
- [x] 已有一致条目不重复造预览；本批只渲染会暴露候选差异或真实边界的对照。
- [x] `components.css` 相关 recipe 家族在单一 catalog 条目中记录 Recipe/Upstream Owner、Keep 处置与真实目标消费者。
- [x] `base.css` 保持 Foundation Owner，`theme.css` 保持 Token Owner，产品 Module 保持结构/状态 Owner；隔离 baseline 不拥有生产视觉值。
- [x] 本轮不拆 CSS 文件、不删除 recipe、不更新生产样式合同、不新增 wrapper、Provider、feature flag 或兼容双轨。
- [ ] 第十四批只有用户实际确认后才标记完成；五项 Keep 推荐仍等待人工确认。

## Implementation evidence

- 五个候选全部进入第十四批；Current 面优先复用生产公开组件，Task Preview 因依赖 Store、Query 与 Shell 生命周期而只登记真实应用边界。
- Native fixture registry 与共享数据保持 reference-only；Current previews 留在父 Lab，baseline 可达模块不导入生产模块。
- HeroUI 采用状态与处置分离：HoverCard、InlineSelect、ComboBox/Autocomplete、Segment 保持候选能力但当前推荐 Keep；TagGroup 明确为无生产场景并推荐 Keep。
- Recipe 映射直接保存在 catalog review unit，不另建第二份可编辑审计表；所有实际 CSS 删除项均为“无”。
- HoverCard 的 Current 合同按真实调用方记录为键盘打开、焦点目标切换与预览内指针驻留；未接线的 pointer-open 能力不算已采用行为。
- 第十四批状态保持 `pending`，等待用户人工确认，不能由 DOM、类型或构建检查代签。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- Ticket 03 建立的隔离 renderer 聚焦测试
- `bun test scripts/check-ui-lab-baseline.test.ts`
- 人工检查五个候选的同 fixture 对照、Owner 与处置结论
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
