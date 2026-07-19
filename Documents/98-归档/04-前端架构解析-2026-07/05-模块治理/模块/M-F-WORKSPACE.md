# M-F-WORKSPACE · features/workspace

> 日期：2026-07-17  
> 状态：**decided** · **decide-only**  
> 类型：**platform（极薄 · 工作区事件 → Query 失效）**  
> 切分：**Keep**（不并 space / sync）

---

## A. 现网

- 仅 `useWorkspaceSync(scope)`：监听 Tauri/前端事件 → debounce → `invalidateWorkspaceQueries`  
- 挂载点：`layout/ShellRouteLayout`  
- ~3 文件；doctor 曾报大量 fresh-deps（handler 稳定化债）

## B. 边界

| 负责 | 不负责 |
|------|--------|
| scope 级缓存失效编排 | Space CRUD、同步协议 UI、URL |
| | 实体业务 |

## C. 方案

| 方案 | 结论 |
|------|------|
| **W1 Keep 极薄** | **✅** |
| 并 space | ❌（实体 vs 失效） |
| 并 sync | ❌（云同步状态 ≠ 本地事件 invalidate） |
| 并 app | 可选，现 Keep feature 更清晰 |

## D. 决议

1. **Keep** workspace  
2. 纯化：稳定 event handler deps（实现债）  
3. 只被 ShellRouteLayout（或等价 L1）挂载  
4. decide-only  

开放：invalidate 粒度是否过宽（性能后议）。
