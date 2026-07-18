/**
 * lifecycle 域对外公共面（`@/features/lifecycle`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/lifecycle'`。
 * 禁止深路径进 api/hooks/components/bulk。
 * 归档/回收站编排域：列表聚合 + 写路径委托 task/project/space public。
 */

// ── IO ──────────────────────────────────────────────────────────────────────

/** 归档/回收站列表（徽章、Bulk Boundary 等）。 */
export { listLifecycleEntries } from './api/lifecycle'

// ── Hooks ───────────────────────────────────────────────────────────────────

/** 列表 Query（侧栏徽章等）。 */
export { useLifecycleEntriesQuery } from './hooks'

// ── UI ──────────────────────────────────────────────────────────────────────

/** 归档/回收站列表页（routes 薄页挂 mode）。 */
export { LifecycleList } from './components/LifecycleList'

/** 生命周期看板（EntityScene adapter）。 */
export { LifecycleBoard } from './components/LifecycleBoard'

// ── 批量 / 命令 ─────────────────────────────────────────────────────────────

/**
 * 生命周期批量：动作定义 + adapter。
 * 壳 Boundary 只 compose 各域 public。
 */
export { lifecycleBulkActions, createLifecycleBulkAdapter } from './bulk'

/** 归档/回收站 bulk 命令 handlers（供壳 compose）。 */
export { registerLifecycleCommands } from './commands/registerLifecycleCommands'
