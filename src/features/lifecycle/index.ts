/**
 * @fileoverview **lifecycle · 唯一对外公共面（`@/features/lifecycle`）**
 *
 * 归档 / 回收站编排：列表 IO、Query/mutations、列表页与看板。
 *
 * 外模块：`import { … } from '@/features/lifecycle'`
 * 禁止：`@/features/lifecycle/api|hooks|components/…`
 */

// ── API ─────────────────────────────────────────────────────────────────────

export {
	listLifecycleEntries,
	deleteLifecycleEntry,
	restoreLifecycleEntry,
	permanentlyDeleteLifecycleEntry,
} from './api/lifecycle'

// ── Hooks ───────────────────────────────────────────────────────────────────

export {
	useLifecycleEntriesQuery,
	useRestoreLifecycleEntryMutation,
	useDeleteLifecycleEntryMutation,
	usePermanentlyDeleteLifecycleEntryMutation,
	lifecycleKeys,
} from './hooks'

// ── 官方组件 ────────────────────────────────────────────────────────────────

/**
 * 归档/回收站列表页（routes 薄页直接挂 mode/title/icon）。
 */
export { LifecycleList } from './components/LifecycleList'

/** 生命周期看板（EntityScene adapter / 测试）。 */
export { LifecycleBoard } from './components/LifecycleBoard'

/**
 * 生命周期批量：动作定义 + adapter。
 * 壳 Boundary 只 compose 各域 public，bulk-action 只做引擎。
 */
export {
	getLifecycleBulkActionDefinition,
	lifecycleBulkActionDefinitions,
	lifecycleBulkActions,
	createLifecycleBulkAdapter,
	type LifecycleBulkAdapter,
	type LifecycleBulkMutationReport,
} from './bulk'

/** 命令选中快照（归档/回收站 → command）。 */
export { buildLifecycleCommandSelection } from './model/buildLifecycleCommandSelection'
