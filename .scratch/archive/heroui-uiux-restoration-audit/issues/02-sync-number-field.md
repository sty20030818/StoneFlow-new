# 02 — 同步间隔迁移至 HeroUI NumberField

**What to build:** 让用户通过 HeroUI NumberField 输入或步进调整同步间隔，在离开整个字段或按 Enter 时才保存一次，并继续以后台返回的 canonical 同步策略作为唯一真实状态。

**Blocked by:** None — can start immediately.

**Status:** completed; archived; manual acceptance transferred

- [x] 同步间隔使用受控 HeroUI NumberField，合法范围为 1 到 1440 分钟，步进为 1，busy 时正确禁用。
- [x] 输入、方向键和步进按钮只更新本地数字草稿，不在每次变化时调用 Tauri。
- [x] 焦点离开整个 NumberField 或按 Enter 时最多提交一次；字段内部输入框与步进按钮之间的焦点移动不会提前提交。
- [x] 提交前得到有效整数；值未变化时不调用持久化接口。
- [x] 保存成功后采用后台返回的 canonical policy；保存失败后恢复后台真实值并显示既有错误反馈。
- [x] 切换同步模式时继续保留最后一次有效间隔，不新增第二套同步策略接口或事实源。
- [x] 旧字符串草稿的解析、钳制和兼容分支全部删除。
- [x] Settings 行为测试覆盖输入、步进、Enter、focus-exit、无变化及失败回滚，相关测试与根级前端门禁通过。
