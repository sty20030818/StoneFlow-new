# 02: 保存后打开新 View，切换时恢复正确查询

**What to build:** 从所有任务、独立事项、项目或 Saved View 保存当前查询后进入新 View；覆盖、恢复、切换及失败重试都保持查询与用户当前会话一致。

**Blocked by:** None (can start immediately).

**Status:** implemented; archived; remaining acceptance transferred

**实施与证据：** [02 验证记录](../02-verification.md)保留本票实施与自动／浏览器证据；[09 验证记录](../09-verification.md)已补实际 Tauri 原始项目链及独立事项、所有任务、Saved View 的代表性操作。项目保存后返回未完成恢复 6 项，全部恢复 8 项；整包剩余验收继续由 09 汇总。

**覆盖：** V04、AR1、V02 的创建/另存/覆盖部分；用户故事 1–17、初步原始场景回归。

- [x] 先把重复保存流程收回 View 的共同用例：页面提供提交时的完整定义快照和路由动作，统一 mutation、结果身份、清 Draft 与落点；视觉 TaskWorkspace 保持纯组合，无新增 View store 或依赖环。
- [x] 四类来源保存准确的 scope/context/baseViewKey/effective filters，创建和另存进入实际返回 ID 的详情，目标 URL 无来源 Draft；Default 不入库、不被覆盖，工具条继续只列内置项。
- [x] 覆盖仅更新当前有效 Saved View 的 filters，不改变固定边界和身份；修改与 Outbox 提交成功后才反馈成功。
- [x] 创建/另存/覆盖失败保留名称、来源 Draft 和原记录，有可感知错误与重试；提交中防重复，提交数据不受之后页面切换影响。
- [x] 导航与对应来源 Draft 清理一起成功；导航失败保留来源 URL/Draft，显示“已保存，但未能打开”，恢复只打开返回 ID，创建总次数仍为一次。
- [x] 提交中允许关闭；关闭、切来源或新会话后，旧结果只完成必要缓存失效，不导航、不清新 Draft、不关闭新弹窗。旧任务请求也不得覆盖新来源结果。
- [x] 默认项切换在同一交互更新选中项并清除旧 Draft；恢复只删除当前 Draft；非空 Saved base 上的空 Draft、刷新和前进后退保持准确语义。
- [x] 真实 Router/Query 和页面组合跑四类来源的保存、打开、返回 Default、切到“全部”；todo/doing/waiting/done 混合夹具断言可见任务和实际请求，覆盖失败、迟到响应与导航失败，不能只测回调。
- [x] 在可操作的实际 Tauri 主窗口初验用户原场景，证据不足则明确未完成；整包原生结案仍由 09 汇总。修订 A2 与 task-workspace/View 文档中的职责冲突，相关消费者同票收口。
- [x] 本票完成前检查保存/覆盖/取消/重试的键盘路径、焦点恢复与长名称/错误在窄窗口的可达性，不推迟到整包验收。
