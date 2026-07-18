# As-Is · 04 Features · 平台能力

> 状态：**W3 深挖完成**（2026-07-15）  
> 范围：标签为 platform 的 14 个 feature（调研分类，**非最终依赖策略**）  
> 装配真相：多数在 `ShellLayout` 挂载（见 [03](./03-app-shell-and-layouts.md)）  
> 颗粒度：每个 feature 六卡级结论 + 子结构 + 消费者/Delete；command/bulk 到子系统级。

---

## 0. 章结论速览

| 优先级 | ID | 路径 | 文件数 | 外部消费者文件 | Delete | 评级 | 建议 |
|--------|-----|------|--------|----------------|--------|------|------|
| 1 | FE-F-COMMAND | `command` | 59 | ~15 | **1** | **Debt** | Keep→收口公开 API / 减 barrel |
| 2 | FE-F-BULK | `bulk-action` | 43 | ~17 | **1–2** | **Acceptable** | Keep；依赖 danger-confirm |
| 3 | FE-F-META | `metadata-fields` | 27 | ~28 | 2 | Acceptable | Keep；高入度 UI 契约 |
| 4 | FE-F-DISPLAY | `display-options` | 28 | ~8 | 3 | Acceptable | Keep |
| 5 | FE-F-SELECTION | `selection` | 12 | ~12 | 2 | **Optimal–Acceptable** | Keep |
| 6 | FE-F-GSEARCH | `global-search` | 13 | ~4 | 3 | Acceptable | Keep |
| 7 | FE-F-ENTITY-DETAIL | `entity-detail` | 10 | ~11 | 2 | Acceptable | Keep；分类=platform/壳协作 |
| 8 | FE-F-UPDATE | `update` | 18 | ~3 | 3 | Acceptable | Keep |
| 9 | FE-F-SYNC | `sync` | 11 | ~7 | 3 | Acceptable | Keep |
| 10 | FE-F-DANGER | `danger-confirm` | 6 | ~20 | 2 | **Optimal** | Keep |
| 11 | FE-F-FILTER | `filter` | 3 | ~10 | 3 | Acceptable | Keep |
| 12 | FE-F-SUBMIT | `submit` | 2 | ~10 | 3 | **Optimal** | Keep |
| 13 | FE-F-WORKSPACE | `workspace` | 2 | **1** | 4 | **Optimal** | Keep（薄） |
| 14 | FE-F-HEALTH | `healthcheck` | 6 | **0** | **5** | **Debt** | Delete 或接 Footer |

### 平台层总判断

1. **真平台内核（Delete 1，焊在 ShellLayout）：** `command`、`bulk-action`（+ 其依赖 `danger-confirm` / `selection` / `submit` / `filter`）。  
2. **横切 UI 契约（高入度）：** `metadata-fields`、`display-options`、`entity-detail`。  
3. **系统服务型（壳脚注）：** `sync`、`update`、`workspace`。  
4. **孤儿：** `healthcheck` 无外部消费者。  
5. **架构债主因：**  
   - `command` / `bulk-action` **根 barrel `export *`**（扩大依赖面，Vercel bundle 规则）  
   - Shell 装配把平台 feature 焊死（W2 SHELL-D1）  
   - 平台之间网状依赖：command ↔ selection ↔ bulk ↔ danger；command → filter/metadata  

**对决策 2=A（可删除性）：** 平台 feature **不应追求 Delete 5**；目标应改为「公开 API 最小 + 装配可插拔」，使删掉一个平台能力时只改 `ShellProviders` 注册表一行，而不是改 1271 行 ShellLayout。

---

## 1. 平台能力关系图（As-Is）

```txt
                    ┌─────────────────┐
                    │  ShellLayout    │  装配根
                    └────────┬────────┘
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   CommandSelection    SubmitRegistry     PageFilter
   (selection)         (submit)           (filter)
         │                   │                   │
         └─────────┬─────────┴─────────┬─────────┘
                   ▼                   ▼
            Command runtime      DangerConfirm
            + ShortcutLayer            │
                   │                   ▼
                   │            BulkActionProvider
                   │            (adapters@Shell)
                   ▼
            CommandMenu / Help
                   │
            global-search (菜单内搜索)

EntityDetailController ──► ShellDrawer
TaskPreview (task feature，非本章) ──► ShellMain

workspace sync ──► ShellRouteLayout only
sync / update ──► Footer / Settings / SystemStatusChip
display-options / metadata-fields ──► pages + boards + command menu
healthcheck ──► （无接线）
```

---

## 2. FE-F-COMMAND · `features/command`（59 files）

### A. 身份卡

| 字段 | 内容 |
|------|------|
| 标签 | platform · **true-platform** |
| 一句话 | 全局命令注册表 + 快捷键/和弦 + Command Menu/Help + Shell 动作适配 |
| 不负责 | 业务 mutation 实现（经 adapter 回调）、路由真相、列表选择存储本体 |
| 壳厚度 | thick-feature |
| 公开 API（实际被外用） | `core` 类型/`COMMAND_IDS`、`adapters` 的 `ShellCommandActions`/`ShellNavigationTarget`、`runtime` hooks、`CommandShortcutLayer`、`DEFAULT_KEYBINDINGS`、`ui` CommandMenu/ShortcutHelp… |
| 私有面（应禁） | 理想上 `commands/*` 内部定义、部分 ui 细节；**根 barrel 破坏了私有边界** |

### B. 结构卡

```txt
command/
  core/          类型、Registry、Runtime、Context 工厂、COMMAND_IDS
  commands/      按域拆分的命令定义 + createShellCommandRegistry
  adapters/      ShellCommandActions 绑定
  keybinding/    绑定表、匹配、input-guard、format
  runtime/       useCommandContext / Runtime / Runner
  shortcuts/     CommandShortcutLayer、chord session、display
  ui/            CommandMenu、ShortcutHelp、ChordHint、menu model
  index.ts       export * 全部子树  ⚠️
```

各子目录几乎都有 `index.ts` barrel。

**命令域文件：** general, open, new, navigation, task, project, filter, inbox, layout, lifecycle, system, view。

### C. 行为卡

| 维度 | 记录 |
|------|------|
| Server state | **无** Query |
| Client state | Runtime 实例在 ShellLayout；chord session 局部 state；dialog 开闭在 shell `useDialogStore` |
| IPC | 无直接 invoke；system 类命令经 adapter |
| URL | 导航类经 `ShellCommandActions.navigateTo` → intents |
| 测试 | core/runtime/keybinding/shortcuts/ui 多套单测 |

### D. 依赖卡

**上游：** React；`filter` 类型（PageFilterKind）；`metadata-fields`（TaskPlacementTarget 经 core re-export）；`global-search`（CommandMenu）；shared UI（cmdk 等）  

**下游（外）：** ShellLayout（主）、ShellHeader、UserAppMenu、navigation/intents（`ShellNavigationTarget`）、selection（CommandSelectionContext 类型）、bulk-action（selection snapshot）、task shortcuts  

**装配：** ShellLayout 构建 `shellCommandActions` → `useCommandRuntime` → ShortcutLayer + Header menu  

**Delete Test：** 删目录 → 主壳快捷键/菜单/大量类型导入全挂。**Delete = 1**

### E. 质量卡

| 项 | 结果 | 证据 |
|----|------|------|
| 内部分层清晰 | **Pass** | core/commands/adapters/runtime 分离好 |
| 无根 barrel | **Fail** | `index.ts` export * |
| 无裸 invoke | **Pass** | |
| 与官方模式 | **Pass** | 自建 command palette 合理 |
| Composition | **Partial** | Adapter 接口巨大（ShellCommandActions ~30 方法）→ 焊死 Shell |
| 可插拔删除 | **Fail** | 非 registry 挂载，而是 Shell 手写 actions |

### F. 结论

- **评级：Debt**（内部设计不差；**公开面与装配耦合**是债）  
- **风险：** ① 巨型 adapter 接口 ② barrel ③ 命令 id 与 bulk/selection 语义交织  
- **建议：Keep**；To-Be：`createShellCommandRegistry` 的 actions 由小组件/插件注册；消费方只 import `@/features/command/core` 等具体路径  
- **To-Be 一句话：** Command 内核保持；Shell 只注入 `ShellCommandActions` 的实现模块，不内联 200 行  

---

## 3. FE-F-BULK · `features/bulk-action`（43 files）

### A. 身份

| 字段 | 内容 |
|------|------|
| 职责 | 批量动作契约、registry/runtime、实体 adapter、确认流、Bulk bar/菜单 UI |
| 不负责 | 行多选状态本体（selection）、危险弹窗 UI 本体（danger-confirm） |
| Delete | **1–2**（卸 Provider 后列表页 bulk 全挂） |

### B. 结构

```txt
bulk-action/
  core/       types, registry, runtime, selection snapshots
  actions/    task / project / lifecycle bulk action 定义
  adapters/   createTask|Project|LifecycleBulkAdapter（调领域 api）
  runtime/    BulkActionProvider, runners
  selection/  use-section-selection
  ui/         BulkActionBar, ConfirmDialog, toast, menu action
  index.ts    export * ⚠️
```

### C. 行为

| 维度 | 记录 |
|------|------|
| Server | adapter 内调用 task/project/lifecycle **api** + `refreshLoadedSlices`（Shell 注入 invalidate） |
| Client | Provider 内 isExecuting；确认经 danger-confirm |
| 测试 | actions/adapters/runtime/ui 覆盖较好 |

### D. 依赖

**上游：** `danger-confirm`（Provider 内 requestDangerConfirm）；领域 api（adapters）；metadata placement 类型（task actions）  

**下游：** ShellLayout（装配+command bridge）；inbox/all-tasks/views/project/lifecycle 页与 TaskBoard/ProjectBoard；task shortcuts  

**耦合类型：** Provider 嵌套 + adapter 注入 + command 调 `runBulkAction`  

### E. 质量

| 项 | 结果 |
|----|------|
| 契约/adapter 分离 | **Pass** |
| barrel | **Fail**（根 export *） |
| adapter 类型 `BulkActionAdapter = unknown` | **Partial**（灵活但弱类型） |
| 确认复用 danger-confirm | **Pass** |

### F. 结论

- **评级：Acceptable**  
- **建议：Keep**；收紧 adapter 类型；去根 barrel  
- **可删除性：** 比 command 略好（页面显式用 BulkActionBar），但 Shell 命令桥仍焊死  

---

## 4. FE-F-SELECTION · `features/selection`（12 files）

### A–F 摘要

| 字段 | 内容 |
|------|------|
| 职责 | 实体多选 hook；Command 选择注册表（页面向 shell 注册当前 selection）；行快捷键作用域 UI |
| 结构 | `model/`（Provider、entitySelection、commandSelection builders、escape）；`ui/EntityRowShortcutScope` |
| 公开 | `CommandSelectionProvider`、`useRegisterCommandSelection`、`useEntitySelection`、`build*CommandSelection` |
| 上游 | **command/core** 的 `CommandSelectionContext` 类型（平台→平台） |
| 下游 | ShellLayout；几乎所有列表页；task `useTaskSelection` |
| Delete | **2**（可改为页面自管，但命令批量失效） |
| 评级 | **Optimal–Acceptable** |
| 质量 | Provider 拆 state/actions context **Pass**；依赖 command 类型 **Partial**（可接受） |
| 建议 | Keep |

---

## 5. FE-F-SUBMIT · `features/submit`（2 files）

| 字段 | 内容 |
|------|------|
| 职责 | 提交目标注册表；default/continue/open intents；稳定 snapshot（useSyncExternalStore） |
| 不负责 | 表单库、mutation、实体 store |
| 公开 | Provider、`useRegisterSubmitTarget`、`useSubmitRegistryContext/Actions` |
| 上游 | 仅 React |
| 下游 | ShellLayout（command submit*）；`shared/form/use-submit-target-from-form`；task/project create、space/view editor |
| Delete | **3** |
| 评级 | **Optimal** |
| Composition | state/actions 分离、priority 注册 **Pass** |
| 建议 | Keep · **平台小而美标杆** |

---

## 6. FE-F-FILTER · `features/filter`（3 files）

| 字段 | 内容 |
|------|------|
| 职责 | 页级筛选 Provider + task 页 filter controller 辅助 |
| 结构 | `PageFilterProvider`、`useTaskPageFilterController` |
| 装配 | ShellLayout 全局 Provider；页面 `useRegisterPageFilterController` |
| 下游 | ShellLayout/Header/command adapter/menu；inbox/all-tasks/no-project/project 页 |
| Delete | **3** |
| 评级 | Acceptable |
| 债 | 名「filter」但实现偏 task 页能力；与 command filter.* 命令耦合 |
| 建议 | Keep；To-Be 明确 task-only 或泛化 |

---

## 7. FE-F-DANGER · `features/danger-confirm`（6 files）

| 字段 | 内容 |
|------|------|
| 职责 | 危险操作确认请求/Promise API + Dialog UI |
| 结构 | model 纯逻辑、runtime Provider、ui Dialog |
| 装配 | ShellLayout `DangerConfirmProvider`（在 Bulk 外层，Bulk 依赖它） |
| 下游 | bulk Provider；task/project/lifecycle 菜单与 row；Sidebar；~20 文件 |
| Delete | **2** |
| 评级 | **Optimal** |
| 建议 | Keep |

---

## 8. FE-F-ENTITY-DETAIL · `features/entity-detail`（10 files）

| 字段 | 内容 |
|------|------|
| 分类 | platform / **壳协作**（非独立产品页） |
| 职责 | 详情抽屉路由状态（search `?task=`/`?project=` 等）解析；open/close/page 导航；DrawerHost UI |
| 真相源 | **URL search**（与 W1 一致：不靠 useDrawerStore） |
| 公开 | `useEntityDetailController`、`EntityDetailDrawerHost`、parse/build search helpers |
| 下游 | ShellLayout/Main/Drawer；列表页 open drawer；TaskCreate 等 |
| 上游 | TanStack Router；navigation intents（page 模式） |
| Delete | **2** |
| 评级 | Acceptable |
| 债 | 与 shell `useDrawerStore` 概念并存（W2 SHELL-D5）；search 契约需全站统一 |
| 建议 | Keep；文档化 search 键；淘汰 useDrawerStore |

---

## 9. FE-F-WORKSPACE · `features/workspace`（2 files）

| 字段 | 内容 |
|------|------|
| 职责 | **仅** 监听 Tauri/前端事件 → debounce → `invalidateWorkspaceQueries` |
| 不负责 | API 工厂、业务规则 |
| 装配 | **仅** `ShellRouteLayout` 调用 `useWorkspaceSync(scope)` |
| 空目录 | 曾疑 `api/` 空 — 当前只有 model（无空 api 文件） |
| Delete | **4**（可内联进 ShellRouteLayout，但不建议） |
| 评级 | **Optimal**（薄边界正确） |
| 债 | `console.info` 较多（噪音）；invalidate 范围见 W8 |
| 建议 | Keep |

---

## 10. FE-F-SYNC · `features/sync`（11 files）

| 字段 | 内容 |
|------|------|
| 职责 | 云同步状态 IPC facade、Controller、Footer/Sidebar UI、配置 Dialog |
| 结构 | `api/sync.ts`（invoke）、`model/*`、`ui/*` |
| IPC 命令（api 层，名以代码为准） | status/diagnostics/config/trigger 等（见 `api/sync.ts` 全文，W8 汇总） |
| 装配 | ShellLayout `SyncStatusProvider`；Footer/Sidebar 消费；Settings sync panel |
| Delete | **3** |
| 评级 | Acceptable |
| 建议 | Keep |

---

## 11. FE-F-UPDATE · `features/update`（18 files）

| 字段 | 内容 |
|------|------|
| 职责 | 应用内更新检查/下载/安装 IPC、Zustand store、事件、Dialog/Footer/设置段 |
| 结构 | api / model / ui；根 `index.ts` 有选择 re-export（非 export * 全部） |
| IPC | `download_and_install`、`restart_and_install`、`skip_version`、`set_check_mode`、`set_channel`、`set_check_interval_secs`、`cancel_update_download` 等 |
| 装配 | ShellLayout `useUpdateEvents` + `UpdateDialog` + `SystemStatusChip`；Footer 版本/状态；SettingsUpdatePanel |
| Delete | **3** |
| 评级 | Acceptable |
| 建议 | Keep |

---

## 12. FE-F-HEALTH · `features/healthcheck`（6 files）

| 字段 | 内容 |
|------|------|
| 职责 | `healthcheck` invoke + query keys/hooks |
| 消费者 | **0 个外部文件** |
| Delete | **5** |
| 评级 | **Debt**（死代码能力或未接线） |
| 建议 | **Delete** 或接到 Footer/SystemStatus；As-Is 标 empty-wiring |
| IPC | `healthcheck` |

---

## 13. FE-F-GSEARCH · `features/global-search`（13 files）

| 字段 | 内容 |
|------|------|
| 职责 | `search_entities` IPC；query hooks；Header 输入/结果；focus intent store；结果导航 intents |
| 结构 | api / query / model / ui |
| 装配 | Header + CommandMenu；ShellLayout 调 `useSearchFocusIntentStore` |
| Delete | **3** |
| 评级 | Acceptable |
| 建议 | Keep |

---

## 14. FE-F-DISPLAY · `features/display-options`（28 files）

| 字段 | 内容 |
|------|------|
| 职责 | 任务列表展示选项（属性/分组等）规范、本地 Tauri Store 偏好、apply 到 board、Popover UI |
| 存储 | `display-options-preferences.json`（非业务 IPC） |
| 结构 | core / api / model(query+mutation) / adapters/task / ui |
| 下游 | EntityScene types；TaskBoard/Row；inbox/all-tasks/views/project/no-project 页 |
| Delete | **3** |
| 评级 | Acceptable |
| 债 | 多处 barrel；与 task 强绑定但名泛「display-options」 |
| 建议 | Keep |

---

## 15. FE-F-META · `features/metadata-fields`（27 files）

| 字段 | 内容 |
|------|------|
| 职责 | 优先级/状态/日期/归属等元数据字段的 **UI 契约 + adapters**（task/project/space） |
| 结构 | core（types/specs/placement）/ ui（dropdowns/dialogs）/ adapters |
| 下游 | **最高入度平台之一 ~28 文件**：task board/create/detail/context menu、command menu、bulk task adapter、entity-scene types、ShellLayout CustomDateDialog、create-dialog-shell |
| Delete | **2**（替换成本高） |
| 评级 | Acceptable |
| 债 | 根 barrel；名称像共享 UI 但在 features；与 domain 展示强耦合 |
| 建议 | Keep；To-Be 评估是否部分下沉 `shared/ui` 或保持「字段协议平台」 |

---

## 16. 平台 × 平台依赖矩阵（W3 快照）

单元格：`P` 公开依赖 · `T` 类型 · `0` 无 · `A` 仅经 Shell 装配共存

| from \ to | command | bulk | selection | submit | filter | danger | entity-detail | meta | display | gsearch | workspace | sync | update | health |
|-----------|---------|------|-----------|--------|--------|--------|---------------|------|---------|---------|-----------|------|--------|--------|
| command | — | 0 | T* | 0 | T | 0 | 0 | T | 0 | P | 0 | 0 | 0 | 0 |
| bulk | T | — | 0 | 0 | 0 | P | 0 | T | 0 | 0 | 0 | 0 | 0 | 0 |
| selection | T | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| submit | 0 | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| filter | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| danger | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| entity-detail | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| meta | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| display | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| gsearch | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | 0 |
| workspace | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 |
| sync | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 |
| update | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 |
| health | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |

\* selection 实现依赖 command **类型**；command 消费 selection **运行时**由 Shell 注入。  

**Shell 装配边（A）：** command/bulk/selection/submit/filter/danger/entity-detail/sync/update/gsearch 均在壳层共存。

---

## 17. 平台装配表（谁必须在壳上）

| Feature | 装配点 | 卸载影响 |
|---------|--------|----------|
| selection Provider | ShellLayout 最外 | 命令 selection 空 |
| submit Provider | ShellLayout | 快捷提交失效 |
| filter Provider | ShellLayout | 筛选命令/Header 失效 |
| danger Provider | ShellLayout | bulk 确认与多处菜单挂 |
| TaskPreview Provider | ShellLayout | 预览失效（task 域） |
| bulk Provider | ShellLayout | 批量与命令 bulk 失效 |
| CommandShortcutLayer + runtime | ShellLayout | 全局快捷键失效 |
| entity-detail controller | ShellLayoutContent | 抽屉失效 |
| workspace sync | ShellRouteLayout | 事件不刷新 Query |
| sync Provider | ShellLayoutContent | Footer 同步状态 |
| update events/dialog/chip | ShellLayoutContent | 更新体验 |
| healthcheck | **无** | 无 |

---

## 18. 质量债汇总（进 Gap）

| ID | 项 | 严重度 |
|----|-----|--------|
| PLAT-D1 | command / bulk-action 根 `export *` barrel | high |
| PLAT-D2 | ShellCommandActions 巨型接口焊死 ShellLayout | high |
| PLAT-D3 | healthcheck 零消费者 | med |
| PLAT-D4 | 平台互依类型环（command↔selection） | low–med |
| PLAT-D5 | bulk `BulkActionAdapter = unknown` | low |
| PLAT-D6 | filter/display/meta 名泛实际 task 向 | low |
| PLAT-D7 | 多 feature 默认 barrel 违反 CONVENTIONS | med |
| PLAT-D8 | workspace 调试 log 噪音 | low |

交叉：**SHELL-D1**（装配根）是平台可删除性的最大外部阻碍。

---

## 19. 与「删 feature 只改装配+route」

| Feature | 接近理想？ | 说明 |
|---------|------------|------|
| submit / danger / workspace | 较近 | 边界清晰、体积小 |
| selection / filter | 中 | Provider 可卸，页面需改注册 |
| sync / update / gsearch / display | 中 | 壳+设置/页引用有限 |
| metadata-fields | 远 | 入度极高 |
| bulk-action | 远 | Shell+多页+command |
| command | **最远** | 类型+快捷键+菜单+intents 引用 |
| healthcheck | 已可删 | 无引用 |

---

## 20. W3 未覆盖 / 留给后续

- 每个 command id 的 enabled 规则表 → 过细，需要时再拆  
- bulk adapter 与 domain api 命令名全表 → **W8**  
- display-options store key 全表 → W8  
- 领域 features 如何注册 selection/filter → **W4/W5**  

---

## 21. Session 收口

- W3 完成：14 平台 feature 全登记评级与关系  
- 标杆：**submit / danger / workspace**  
- 最大债：**command 公开面 + Shell 装配**；**healthcheck 孤儿**  
- **下一 Wave：W4** 领域实体（task → project → space → lifecycle → view → activity）  
