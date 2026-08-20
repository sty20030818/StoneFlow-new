# 03 — 完成 HeroUI OSS/Pro 公共皮肤 Hard Cut

**What to build:** StoneFlow 为所有当前实际使用的 HeroUI OSS/Pro 标准控件提供完整一致的公共视觉与状态反馈，使代表性消费表面不再依赖组件库默认皮肤，同时保留原有键盘、Overlay、Focus 和可访问性行为。

**Blocked by:** 02 — 冻结代表性 Light 视觉合同

**Status:** ready-for-agent

- [ ] 对当前用户可达表面实际使用的 HeroUI OSS/Pro 组件完成消费者清单；不为仓库尚未使用的组件预建样式。
- [ ] Button、表单控件、Tabs、列表项、Menu、Popover、Command、Modal、Sheet、Alert、Chip 等实际消费者均由唯一公共 BEM/data-state recipe 提供 StoneFlow 皮肤。
- [ ] 每个实际组件覆盖其适用的 Rest、Hover、Pressed、Selected、Focus-visible、Open、Disabled、Loading、Invalid 与 Danger 状态及必要组合态。
- [ ] 公共 recipe 只消费唯一语义主题值，不包含独立原始颜色，不因 Accent 预设复制六套组件规则。
- [ ] HeroUI OSS/Pro 继续拥有结构、行为、键盘交互、Overlay 语义、Focus 管理与 ARIA；本次只替换视觉结果。
- [ ] 每类公共 recipe 在代表性真实消费者上能够独立呈现完整 StoneFlow 视觉，不依赖 feature 补齐缺失状态；全量产品消费者的竞争性私有皮肤由后续横切迁移统一删除。
- [ ] 不新增一对一组件 wrapper、TypeScript token 镜像、第二套 variant runtime、设计系统包、Storybook 或新依赖。
- [ ] 现有组件与 Overlay 行为测试保持通过，并为本次触及的可观察状态补充最小必要断言，不使用 className 快照代替视觉验收。
