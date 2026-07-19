# M-F-UPDATE · features/update

> 日期：2026-07-17  
> 状态：**decided** · **decide-only**  
> 类型：**platform / 系统服务（应用内更新）**  
> 切分：**Keep**（不并 sync）

---

## A. 现网

```txt
api: check/download/install/settings/session …
model: useUpdateStore、useUpdateEvents、presentation/phase
components: Dialog、Settings 段、Footer chip、Progress…
layout: useUpdateEvents + Overlays Dialog/Chip
settings: UpdateSettingsSection
```

## B. 边界

| 负责 | 不负责 |
|------|--------|
| 检查/下载/安装更新、通道/间隔、会话 phase、相关 UI | 云同步（sync） |
| | 业务实体 |

## C. 方案

| 方案 | 结论 |
|------|------|
| **U1 Keep** | **✅** |
| 并 sync | ❌ |
| 状态进 settings only | ❌ 壳 Footer/Chip 也要 |

## D. 协作

```txt
layout Content → useUpdateEvents（听 Tauri 事件）
overlays → UpdateDialog / SystemStatusChip
Footer → Update 状态项 + 版本
settings → UpdateSettingsSection
```

与 **sync** 在 Footer 相邻但 **状态机分离**。

## E. 问题 / 实践

- store + events 偏厚（~300 行级）→ 内拆 phase 纯函数（已有 applyUpdatePhase）  
- 避免与 sync 共用一个「系统 store」  
- 单轨更新状态（产品曾有单轨方案）保持本包内收敛  

## F. 决议

1. **Keep** update  
2. 不并 sync；壳只装配  
3. decide-only；巨石 Dialog/Settings 可后拆 UI  
