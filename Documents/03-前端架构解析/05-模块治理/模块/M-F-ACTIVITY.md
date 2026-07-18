# M-F-ACTIVITY · features/activity

> 日期：2026-07-17  
> 状态：**decided** · **decide-only**  
> 类型：**domain 薄（活动时间线）**  
> 切分：**Keep 观察**（[07](../07-Feature切分与边界总览.md)）  

---

## A. 现网

```txt
api/getEntityActivities
hooks: useEntityActivitiesQuery, keys
components: ActivityDebugPage（/debug/activity）
```

task 详情时间线 UI 多在 **task/detail**，可能另有数据路径——**双源风险**需对齐。

## B. 边界

| 负责 | 不负责 |
|------|--------|
| 实体活动查询端口 + debug | 任务编辑、主列表 |
| debug 页 | 主壳 chrome |

## C. 方案

| 方案 | 结论 |
|------|------|
| **A1 Keep 夹 + 单一查询端口** | **✅ 默认** |
| A2 实现并入 task，删 activity 包 | 仅当确认无跨实体时间线、无 debug 独立演进 |
| A3 扩大为全站动态流 feature | 产品未定前不做 |

## D. 决议

1. **Keep** activity 目录与 public query  
2. **强制**：task 时间线 UI 只走 `useEntityActivitiesQuery` / 同 api（消双源）  
3. 不急并 task  
4. decide-only  

开放：是否支持 project/space 时间线同一 API（类型已 EntityType）。
