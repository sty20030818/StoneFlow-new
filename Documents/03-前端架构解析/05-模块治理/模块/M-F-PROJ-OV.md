# M-F-PROJ-OV · features/project-overview

> 日期：2026-07-17  
> 状态：**decided** · **decide-only**  
> 类型：**scene（薄）**  
> 切分：**Keep 默认**（可并 project，非必须）  

---

## A. 现网

- 仅 `ProjectOverviewPage` + List/Empty  
- 数据：`@/features/project` public hooks  
- 行：`ProjectRowAdapter` from project  
- routes `/projects` 挂本页；详情 `/projects/$id` 挂 project  

## B. 边界

| 负责 | 不负责 |
|------|--------|
| 总览页 UI 编排 | project api/CRUD 实现 |
| 视图筛选展示（若有） | 复制 project 私有 |

## C. 方案

| 方案 | 结论 |
|------|------|
| **O1 Keep 独立 scene** | **✅ 默认** |
| O2 并入 `project/components` | 次选：永远极薄且无独立迭代时 |
| O3 变厚自建 api | ❌ |

## D. 决议

1. **Keep** project-overview  
2. **只**依赖 project public + selection 等平台  
3. 禁止倒依赖 layout（若有则同其它页去掉）  
4. decide-only  

与 **project P2** 一致：domain / scene 分离清晰。
