# M-F-SYNC · features/sync

> 日期：2026-07-17  
> 状态：**decided** · **decide-only**  
> 类型：**platform / 系统服务（云同步）**  
> 切分：**Keep**（不并 update / workspace）

---

## A. 现网

```txt
api: getSyncStatus / configure / runSync …
model: SyncStatusProvider、presentation、footer 派生
components: Footer 项、Sidebar 条、ConfigDialog
settings: SettingsSyncPanel 消费 public
layout: SyncStatusProvider + Footer/Sidebar 挂载
```

## B. 边界

| 负责 | 不负责 |
|------|--------|
| 同步状态、策略配置、手动同步、相关 UI 片段 | App 自动更新（update） |
| | 工作区事件 invalidate（workspace） |
| | 任务/项目业务 |

## C. 方案

| 方案 | 结论 |
|------|------|
| **Y1 Keep 独立** | **✅** |
| 并 update 成「系统状态」大包 | ❌ 产品/发布周期不同 |
| 并 workspace | ❌ |
| 设置页吞掉 sync feature | ❌；settings 只装配面板 |

## D. 协作

```txt
layout Content → SyncStatusProvider
Footer/Sidebar → Sync* UI public
settings → SyncConfigDialog + API
workspace → 独立；数据变更失效不经 sync UI
```

## E. 决议

1. **Keep** sync  
2. settings 只消费 public；不复制状态机  
3. Provider 挂壳；决定-only  
4. 体量：ConfigDialog/Status 可再拆，非切分问题  

开放：离线/冲突 UX 扩展仍落本包。
