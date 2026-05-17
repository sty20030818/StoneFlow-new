# Bulk Action Architecture

> 版本：v1
> 作用：约束 `src/features/bulk-action` 当前已经落地的批量操作架构
> 适用范围：任务、项目、归档页、回收站的多选批量操作
> 最后校对：2026-05-18

---

## 0. 现在的真实心智

批量操作不是按钮逻辑，也不是 Command Menu 的内部实现。

它当前是一条固定链路：

```txt
页面或 Command Selection 冻结 BulkSelectionSnapshot
-> BulkActionRegistry 找到动作定义
-> BulkActionRuntime 判断空选择、禁用状态和确认策略
-> BulkActionProvider 管理确认弹窗与执行状态
-> Entity Adapter 执行业务 mutation 并统一刷新一次
-> 调用方按 BulkActionResult 清空或保留 selection
```

长期分工固定为：

```txt
core controls bulk action contract, snapshot and result helpers
actions controls product bulk action definitions
adapters controls entity mutation capability injection
runtime controls React-side runner and confirmation state
ui controls reusable bulk surfaces and result feedback
selection controls section selection helpers
```

只要后续改动开始在页面里手写批量循环、在 `command/ui` 放 bulk 组件、在 `shared/ui` 增加 bulk 兼容层，或让 task 命名的 selection hook 被 project/lifecycle 复用，就说明架构在退化。

---

## 1. 文档定位

本文件定义三类内容：

1. 当前正式分层；
2. 批量操作运行契约；
3. 后续新增和修改时必须遵守的边界。

本文件不定义：

1. Command Menu 分组策略；
2. Row 快捷键的按键细节；
3. Tauri/Rust mutation 实现；
4. 单条实体操作的 UI 行为。

本文只记录 `src/features/bulk-action` 的实现事实和长期约束，不复述阶段执行过程。

---

## 2. 当前目录分层

当前实现以这六层为准：

```txt
src/features/bulk-action/
├── ARCHITECTURE.md
├── actions/
├── adapters/
├── core/
├── runtime/
├── selection/
└── ui/
```

### `core/`

职责：

1. 定义 `BulkActionId`、`BulkEntityType`、`BulkSelectionSnapshot`、`BulkActionResult`；
2. 提供 snapshot 构造 helper，包括 task、project、lifecycle 和 command selection；
3. 提供 `BulkActionRegistry` 与 `BulkActionRuntime`；
4. 提供 result 处理 helper，例如是否清空 selection、默认反馈文案。

禁止：

1. 依赖 React state；
2. 直接调用 store 或 API；
3. 直接 toast；
4. 读取路由；
5. 写具体 UI 组件。

`core/` 是批量操作契约层，不是页面编排层。

### `actions/`

职责：

1. 定义产品批量动作；
2. 定义动作标题、语义、tone、确认策略和确认文案；
3. 将 runtime 传入的 snapshot 转交给实体 adapter；
4. 把 adapter 返回值标准化为 `BulkActionResult`。

当前动作事实：

```txt
task.completeSelected
task.archiveSelected
task.deleteSelected
task.setPrioritySelected
task.setStatusSelected
task.setDateSelected
lifecycle.restoreSelected
lifecycle.deleteSelected
lifecycle.deletePermanentlySelected
project.archiveSelected
project.deleteSelected
```

禁止：

1. 在 action 里直接 import store；
2. 在 action 里刷新页面；
3. 在 action 里清空 selection；
4. 为未落地实体预留空动作。

### `adapters/`

职责：

1. 接收 Shell 注入的实体 mutation 能力；
2. 批量循环调用已有 API；
3. 成功或部分成功后只刷新一次已加载 slices；
4. 返回 succeeded/failed/skipped ids。

禁止：

1. 每个 id 都触发 store 刷新；
2. 处理确认弹窗；
3. 读取 Command Context；
4. 修改 selection。

### `runtime/`

职责：

1. 提供 `BulkActionProvider`；
2. 持有 registry、adapter context、pending confirmation 和 executing 状态；
3. 在 `requiresConfirm` 为 true 时先弹确认；
4. 暴露 `runBulkAction`、`confirmPendingAction`、`cancelPendingAction`。

禁止：

1. 知道 task/project/lifecycle 的具体业务字段；
2. 持有页面 selection；
3. 替代 Command Runtime。

### `ui/`

职责：

1. 提供 `BulkActionBar`；
2. 提供 `BulkActionConfirmDialog`；
3. 提供 `BulkCommandMenuAction`；
4. 提供 bulk result toast helper。

禁止：

1. 在 `features/command/ui` 放 bulk 组件；
2. 在 `shared/ui` 放 bulk 兼容 re-export；
3. 在 UI 组件里写实体 mutation；
4. 让按钮决定 action 的业务结果。

### `selection/`

职责：

1. 提供跨实体 section selection helper；
2. 只处理批量选择所需的通用选择辅助逻辑。

禁止：

1. 持有 task 专属 row 快捷键；
2. 复制 `features/selection` 的 entity focus/range 逻辑；
3. 处理业务 mutation。

---

## 3. Shell 装配链路

Shell 只做能力装配：

```txt
taskBulkActions + lifecycleBulkActions + projectBulkActions
task adapter + lifecycle adapter + project adapter
-> BulkActionProvider
```

Command Menu 批量命令执行时，Shell 只把当前 `CommandSelectionContext` 转成 `BulkSelectionSnapshot`，再调用统一 `runBulkAction`。Shell 不允许再为 task/project/lifecycle 各写一套批量循环或 result switch。

---

## 4. 页面接入规则

任务页、项目总览、归档页、回收站页统一遵守：

1. selection 使用 `features/selection` 的实体选择能力；
2. Esc 清空使用 `useEntitySelectionEscape`；
3. 底部条使用 `features/bulk-action` 的 `BulkActionBar`；
4. 需要打开 Command Menu 的入口使用 `BulkCommandMenuAction`；
5. 页面触发直接批量动作时，必须使用 bulk-action snapshot helper；
6. 成功清空 selection，部分失败保留 selection。

页面不允许手写本地 `createProjectSnapshot`、`createLifecycleSnapshot` 或重复 result toast switch。

---

## 5. 新增批量动作流程

新增动作时按这个顺序：

1. 在 `core/bulk-action.types.ts` 增加稳定 action id；
2. 在 `actions/` 定义 action metadata、确认策略和 adapter 调用；
3. 在 `adapters/` 增加实体能力，确保一次批量只刷新一次；
4. 在 Shell 的 `BulkActionProvider` 装配 action 和 adapter；
5. 在页面或 Command Menu 增加入口；
6. 补 action、adapter、页面入口和 command model 测试。

如果新实体需要选择能力，先接 `features/selection`，不要在页面里临时维护第二套 selection。
