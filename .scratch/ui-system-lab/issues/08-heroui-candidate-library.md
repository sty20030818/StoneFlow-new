# 08 — 交付可用于决策的 HeroUI 候选库

**What to build:** 让开发者能够在 StoneFlow 当前主题下按“已采用、替换候选、探索中”浏览真实 HeroUI OSS/Pro 决策样例，并看到消费场景、替换对象、能力缺口、验证状态和 peer 要求；候选库用于降低选型成本，不替代官网、不自动迁移生产代码。

**Blocked by:** 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例。

**Status:** ready-for-agent

- [ ] HeroUI 视图按“已采用”“替换候选”“探索中”分组展示可检索目录，并使用项目锁定版本与当前 StoneFlow 主题渲染当前选中候选。
- [ ] 首期 roster 固定为：已采用的 Button、Input、Select、Breadcrumbs、Tooltip、Modal、EmptyState、ListView；替换候选的 SearchField（评估现有搜索 Input）和 DatePicker（评估现有 Calendar 与 Popover/Modal 日期组合）；“探索中”首期保持空状态。本 ticket 不自行扩展到其他组件。
- [ ] 每个“已采用”条目能说明其 StoneFlow 消费场景，每个“替换候选”条目能说明真实替换对象、尚缺能力与验证状态；“探索中”解释首期为何为空，未来只有带明确产品假设的独立 ticket 才能增加条目。
- [ ] 候选详情清楚区分“能渲染”“值得继续评估”和“已批准迁移”；本 ticket 不改生产消费者、不删除旧实现，也不把候选自动升级为产品标准。
- [ ] 同一时间只挂载当前候选；切换、搜索或清空结果不会留下旧 Overlay、异步状态或焦点陷阱。
- [ ] 固定首期 roster 使用现有依赖即可渲染；本 ticket 不安装新的可选 peer。未来候选若需要 peer，必须先显示依赖要求并由独立迁移 ticket 决策。
- [ ] HeroUI Pro 样例只在私有本地 Lab 可见，不复制上游源码或大段官网文档，也没有公开部署入口。
- [ ] 依赖真实 Tauri、窗口激活、业务 Store/Query 或跨窗口协议的候选行为被明确标为仅真实应用验证，不通过重型假数据或新增公共 facade 伪造。
- [ ] 唯一 Lab 根级 DOM 集成测试覆盖 HeroUI 视图切换、三类分组、搜索、候选选择、仅选中项挂载及“探索中”空状态；不新增每个候选的单元测试。
- [ ] 类型、Lint、边界、格式及生产构建门禁通过；没有新增依赖，生产 Module 不依赖候选目录，生产产物不包含 Lab 入口。
