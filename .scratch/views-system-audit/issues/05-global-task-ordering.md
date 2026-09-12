# 05: 完整结果排序与稳定分页

**What to build:** 用户选择排序后，第一页即为全部匹配任务中正确的第一窗口；手动位置与完成项顺序真实生效，继续加载不会打乱顺序。

**Blocked by:** 04 — 筛选条件可准确检查和修改。

**Status:** ready-for-agent

**覆盖：** V07、V06 的完成项排序、AR2 的任务总序；用户故事 32–36、41、42。

- [ ] 复用 04 的规范化成员语义建立统一窗口顺序，显示面板意图经 Query key 和现有 IPC 进入 Rust 共同执行器；Default/Draft 和 Saved 入口行为相同，Display 仍是本机偏好、不入 Saved View。
- [ ] 本票完整验收不分组的有序结果；主/子分组前缀由 06/07 接入同一顺序合同。现有分组消费者保持可运行，不新增第二执行器或 renderer，不提前宣称分组分页已完成。
- [ ] manual 为 position 升序、ID 升序；priority 为按方向的数值序；status 升序为 doing、todo、waiting、done、canceled，降序反转。priority/status 同值采用 updatedAt 降序、ID 升序。manual 只用于现有支持页面。
- [ ] 日期字段按所选方向排列，两方向都将空值置后，同值 updatedAt 降序、ID 升序；沿用页面现有字段能力及派生日期语义，不新增排序选项。
- [ ] smart 固定为状态业务序、dueAt 优先否则 plannedAt 的有效时间升序且空值最后、priority 降序、updatedAt 降序、createdAt 降序、ID 升序；smart/manual 不显示无效方向选项。
- [ ] natural 遵守普通顺序；recency 将非 done 放前并保持普通顺序，done 放后按 completedAt 降序、空值最后、ID 升序。面板写明“已完成置底，最近优先”，显式覆盖完成项 manual 位置，不能使用非传递的局部比较器。
- [ ] SQL 先排序再截页，前端不重新改变全局任务顺序；版本化 cursor 携带完整排序元组并绑定规范化查询、顺序及日期基准，错查询/损坏/不支持版本明确错误并可从首屏恢复。
- [ ] Query key 排除 clause ID、字段显隐和折叠等无关值；改查询/排序或跨天从新窗口开始，慢旧响应不拼入新集合。分页会话内日期基准一致，不增加跨写入快照系统。
- [ ] 首屏精确 totalCount 仅统计成员，续页不重复 COUNT；保留约 150 条窗口、单一 sentinel 和 loaded-only 几何，不全量 materialize、不增加位置 DTO 或总数 spacer。
- [ ] 用超过两页、含第 151 条以后最优先任务、空值/同值/混合完成态的真实仓储夹具逐页验证所有支持顺序、无重复无遗漏；页面至少验证排序选择实际改变首屏、偏好恢复及旧 cursor 恢复。
- [ ] manual 元数据更新不改位置，显式 recency 例外有独立断言；修正冻结错误行为的旧测试。更新现有查询/Display 权威说明，后续组前缀直接扩展同一合同，不留无人负责的过渡旁路。
