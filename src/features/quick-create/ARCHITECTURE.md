# quick-create · 架构契约

> 作用：描述 **当前已落地** 的 `src/features/quick-create` 边界  
> 最后更新：2026-07-17

独立窗 Launcher：**窗生命周期（session）+ 固定壳 UI + 适配主产品能力（task / global-search）**。

---

## 1. 心智模型

```txt
routes/quick-create
  → QuickCreatePage
      → SessionProvider          // phase / bridge / close
      → DomainProvider           // draft / search / submit
      → PresentSession           // preparing → present_session
      → Panel                    // 固定壳五行 + 内滚
```

| 层 | 负责 | 禁止 |
|----|------|------|
| **session** | phase、bridge、present、close、becameKey focus 许可 | draft、搜索、测高 |
| **domain** | draft / search / submit / derived | NSPanel、窗尺寸 |
| **ui** | 固定五行壳、内滚、折叠、控件 | invoke、session phase 细节 |
| **api** | 窗 IPC + 到 task/GS 的适配 | 第二套 create/search 规则 |
| **platform** | 720×500、vibrancy、shadow、定位 | 读 DOM |

跨模块 **只** `import { … } from '@/features/quick-create'`。  
禁止 deep-import `ui|domain|session|api|…`。

---

## 2. 目录

```txt
src/features/quick-create/
├── ARCHITECTURE.md
├── index.ts                 # 仅导出 QuickCreatePage
├── api/                     # 窗 IPC + map*（create→task，search→global-search）
├── session/                 # SessionProvider · reducer · bridge · PresentSession
├── domain/                  # DomainProvider · reducer · hooks
├── ui/                      # Panel · Composer · Results · Footer · controls · adapters
└── model/                   # 类型与格式化
```

---

## 3. 固定几何与材质

| 项 | 值 |
|----|-----|
| 内容壳 | **720 × 500** logical px（原生窗同尺寸） |
| 可变内容 | Results 区内滚；Advanced 壳内折叠 |
| 深度 | **原生** `hasShadow` + `invalidateShadow`（深浅不可调）。本路径是 Tauri `decorations(false)` → NonActivatingPanel，**不能**再加 `Titled`（会 abort）；FE 不画外投影 |

Session：

```txt
booting → hidden → preparing → presenting → visible → closing
                 ↘ error
```

`preparing` 后立即 `present_session`；`session-presented`（becameKey）后 `visible` 并允许 focus。

---

## 4. 窗 IPC（保留）

| 命令 | 用途 |
|------|------|
| `quick_create_get_initial_state` | 打开上下文快照 |
| `quick_create_list_projects_by_space` | 归属选项 |
| `quick_create_open_target` | 聚焦主窗并导航 |
| `prepare/present/close/frontend_ready/unready` | 会话显隐 |

**已删除（勿再调用）：** `quick_create_search` · `quick_create_create` · `quick_create_create_and_open` · `commit_layout`

---

## 5. 禁止事项

- 前端测高 / `commitLayout` / 内容驱动外窗高度
- `layout/` · `shell/` · Frame 空壳目录（已移除）
- 从外模块 deep-import 内部路径
- 复制第二套 task 创建 / 搜索内核
