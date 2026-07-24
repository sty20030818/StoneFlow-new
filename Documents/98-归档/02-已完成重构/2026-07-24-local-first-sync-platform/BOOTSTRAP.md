# 同步引导（Bootstrap）场景矩阵

> 原则：KISS、本机优先、**决策纯函数 / 执行在边缘**。  
> 不在 UI 里散落 if-else；统一由 `BootstrapPlan` 分类后执行。

## 1. 三维状态

| 维度 | 取值 | 如何判断 |
|---|---|---|
| 本机业务数据 | 空 / 有 | tasks/projects/… 存活计数（默认 Space 不算「有」） |
| 云端副本数据 | 空 / 有 | `entity_state`+`tombstones` 非空，或 `MAX(server_seq)>0` |
| 本机同步位置 | 无 / 有 | `sync_cursors.scope = last_pulled_server_seq` |

另：连接串凭证是否可读（钥匙串）——失败时视为**未配置**，不阻断 App 启动。

## 2. 场景 → 计划

| # | 本机数据 | 云端数据 | 本机 cursor | 典型产品故事 | 计划 |
|---|---|---|---|---|---|
| A | 空 | 空 | 无 | 新设备 + 新 Neon | `EmptyPair`：写 cursor=0，Ready |
| B | 有 | 空 | 无 | 老设备有数据，第一次绑云 | `LocalIsOrigin`：seed outbox → 上传 → adopt cursor（**不 wipe 本机**） |
| C | 空 | 有 | 无 | 新设备，云端已有数据 | `RemoteIsOrigin`：全量 baseline 物化本机 |
| D | 有 | 有 | 无 | 两边都有、从未对过齐 | `BothPreferLocal`（v1 默认本机优先，等同 B + 警告日志） |
| E | 任意 | 任意 | 有 | 日常 | `Incremental`：上传 → 增量下载 |
| F | 有 cursor | 日志被裁剪 | 有但过期 | 长期离线 | pull 内 `CursorExpired` → baseline（空本机可 wipe；有未推 outbox 时先 push） |

**明确不做（v1）**：弹窗让用户选「云端覆盖 / 本机覆盖」——个人应用默认本机优先；以后再加 UI。

## 3. 架构（高内聚 / 低耦合）

```text
┌─────────────────────────────────────────┐
│  bootstrap_plan（纯函数，无 IO）          │
│  classify(local, remote, cursor) → Plan │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  engine / run_sync_worker（编排）        │
│  查本地计数、download_full 探针、执行计划 │
└───┬──────────────┬──────────────┬───────┘
    │              │              │
    ▼              ▼              ▼
 origin_seed   outbox_push   cursor_pull
 (写 outbox)   (upload)     (baseline / adopt / delta)
```

- **决策**不依赖 sqlx / keychain  
- **执行**各模块单一职责：seed / upload / pull  
- UI 只展示 `replica_state` + reason，不实现场景分支

## 4. 凭证

| 事件 | 行为 |
|---|---|
| 启动读钥匙串失败（含 macOS 未授权） | **warn + 视为未配置**，App 正常启动 |
| 保存连接串 | 优先钥匙串；失败则错误提示用户（系统设置里允许访问） |
| 日志 | 只打脱敏 host，永不打完整连接串 |

## 5. 与你日志的对应

```
origin_seed enqueued=148  → 场景 B 已触发 seed
随后多次 ensure_ready     → 每轮 push 短连接正常；148 条会较慢
缺少基线 badge            → cursor 尚未写入；整轮 push+adopt 完成后应变 Ready
```

若 push 中途失败，cursor 未写，仍显示「缺少基线」——属预期，修错误后重试即可（seed 幂等标记已存在时不再重复灌 148 条，**若 seed 标记已写但 push 失败** 需依赖 outbox 残留重试——见实现）。
