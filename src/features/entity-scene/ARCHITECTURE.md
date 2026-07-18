# entity-scene · 页级槽位编排

> 作用：描述 **当前已落地** 的 `src/features/entity-scene`  
> 最后更新：2026-07-17

---

## 心智

```txt
列表页 → EntityScene → shared MainCard 槽位
  → Task|Project|Lifecycle BoardAdapter → 各域 public Board
```

只做槽位与 adapter 接线，不拥有列表 Query / 业务 mutation。  
**禁止** 再放回 layout；外模块只走 public。
