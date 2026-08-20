# 05 — 删除旧视觉轨道并修订架构真相

**What to build:** 维护者只需沿着“语义主题 → 公共组件 recipe → 产品消费者”一条路径理解和修改 StoneFlow 视觉，不再面对旧 token、Dark 脚手架、适配层或冲突文档形成的双轨真相。

**Blocked by:** 04 — 横切迁移 StoneFlow 产品表面

**Status:** ready-for-agent

- [ ] 在确认零消费者后删除旧 primitive/semantic/layout token 链、Dark 扩展、shadcn adapter、页面私有通用皮肤、兼容 alias 与零消费者样式。
- [ ] 应用只保留一个 Light 主题，不响应系统深浅色偏好，也不保留 Dark token、`dark:` 分支或未来占位运行时。
- [ ] 唯一语义主题拥有所有视觉值，唯一公共组件层拥有 HeroUI 公共 BEM/data-state recipe，产品组件不成为通用视觉值源。
- [ ] 样式入口与依赖方向只保留一条可解释路径，不存在同一语义的重复 token 或同一组件状态的多个 Owner。
- [ ] HeroUI 平台 ADR 明确改为“HeroUI OSS/Pro 管理行为、结构与可访问性；StoneFlow 管理全部视觉”，并保留 HeroUI 作为唯一 UI 行为平台的决定。
- [ ] 界面系统与样式架构文档删除旧 token、shadcn adapter、Dark 扩展和旧视觉所有权描述，改为当前单向合同。
- [ ] 静态扫描确认没有旧轨道消费者、无意保留的原始重复颜色、页面私有通用控件皮肤或 Dark 分支。
- [ ] 类型检查、Lint、格式检查、模块边界、第一方动效扫描与生产构建保持通过。

