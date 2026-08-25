# 06 — PageFrame 工具区迁移至 HeroUI Toolbar

**What to build:** 让 Default View、筛选和显示动作组成具有明确名称的 HeroUI Toolbar，使键盘用户能够按标准水平工具条模型连续导航，同时保持页面查询与 FilterBar 语义不变。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] PageFrame 工具区拥有 HeroUI Toolbar landmark、可访问名称和水平键盘导航。
- [ ] Tab、左右方向键、Enter 和 Space 遵循 HeroUI Toolbar 的公开交互模型。
- [ ] Default View 继续保持单选且不为空，不产生第二份路由或查询状态。
- [ ] Filter 与 Display 动作保持可达、反馈和既有业务行为不变。
- [ ] FilterBar 仍位于 Toolbar 外，并且只在 Draft 与 base 不同时出现。
- [ ] Toolbar 只负责组合、语义和焦点导航，不拥有筛选、显示、路由或持久化状态。
- [ ] PageFrame 行为测试覆盖 landmark、名称、键盘移动、Default View 规则及 FilterBar dirty 条件，相关测试与根级前端门禁通过。
