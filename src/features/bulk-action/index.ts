/**
 * bulk-action · 主入口（`@/features/bulk-action`）
 *
 * 显式 export 清单（禁止 `export *` 扫子树）。
 * Registry/Runtime/ConfirmDialog 等引擎内部物不进 public。
 */

// ── core ────────────────────────────────────────────────────────────────────

export {
	LIFECYCLE_BULK_ACTION_IDS,
	PROJECT_BULK_ACTION_IDS,
	TASK_BULK_ACTION_IDS,
	type BulkAction,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResult,
	type BulkEntityType,
	type BulkSelectionSnapshot,
	createBulkActionResult,
	shouldConfirmAction,
	createBulkSelectionSnapshot,
	shouldClearBulkSelection,
	type BulkActionResultMessageLabels,
	createCommandBulkSelectionSnapshot,
	createTaskBulkSelectionSnapshotFromTasks,
	createLifecycleBulkSelectionSnapshot,
	createProjectBulkSelectionSnapshotFromProjects,
} from './core'

// ── runtime ─────────────────────────────────────────────────────────────────

export { BulkActionProvider, useBulkActionContext } from './runtime'

// ── selection ───────────────────────────────────────────────────────────────

export { useSectionSelection } from './selection'

// ── components ──────────────────────────────────────────────────────────────

export { BulkActionBar, BulkCommandMenuAction, showBulkActionResultToast } from './components'
