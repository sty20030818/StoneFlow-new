/**
 * @fileoverview **bulk-action · 主入口（`@/features/bulk-action`）**
 *
 * 显式 export 清单（禁止 `export *` 扫子树）。
 * 新增对外符号时改本文件，勿直接依赖 core/components 深路径。
 */

// ── core ────────────────────────────────────────────────────────────────────

export {
	LIFECYCLE_BULK_ACTION_IDS,
	PROJECT_BULK_ACTION_IDS,
	TASK_BULK_ACTION_IDS,
	type BulkAction,
	type BulkActionAdapter,
	type BulkActionConfirmCopy,
	type BulkActionConfirmRequest,
	type BulkActionConfirmationRequest,
	type BulkActionContext,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResult,
	type BulkActionStatus,
	type BulkEntityType,
	type BulkSelectionEntity,
	type BulkSelectionSnapshot,
	type BulkSelectionSource,
	type KnownBulkActionId,
	BulkActionRegistry,
	BulkActionRuntime,
	createBulkActionResult,
	getBulkActionConfirmCopy,
	shouldConfirmAction,
	createBulkSelectionSnapshot,
	getBulkActionResultFeedback,
	shouldClearBulkSelection,
	type BulkActionResultMessageLabels,
	type BulkActionResultFeedback,
	createCommandBulkSelectionSnapshot,
	createTaskBulkSelectionSnapshot,
	createTaskBulkSelectionSnapshotFromTasks,
	createLifecycleBulkSelectionSnapshot,
	createProjectBulkSelectionSnapshot,
	createProjectBulkSelectionSnapshotFromProjects,
} from './core'

// ── actions ─────────────────────────────────────────────────────────────────

export {
	getTaskBulkActionDefinition,
	taskBulkActionDefinitions,
	taskBulkActions,
	type TaskBulkActionPayload,
	getLifecycleBulkActionDefinition,
	lifecycleBulkActionDefinitions,
	lifecycleBulkActions,
	getProjectBulkActionDefinition,
	projectBulkActionDefinitions,
	projectBulkActions,
} from './actions'

// ── adapters ────────────────────────────────────────────────────────────────

export {
	createTaskBulkAdapter,
	resolveBulkCompleteStatus,
	type TaskBulkAdapter,
	type TaskBulkMutationReport,
	createLifecycleBulkAdapter,
	type LifecycleBulkAdapter,
	type LifecycleBulkMutationReport,
	createProjectBulkAdapter,
	type ProjectBulkAdapter,
	type ProjectBulkMutationReport,
} from './adapters'

// ── runtime ─────────────────────────────────────────────────────────────────

export {
	BulkActionProvider,
	useBulkActionContext,
	useBulkActionRuntime,
	useBulkActionRunner,
} from './runtime'

// ── selection ───────────────────────────────────────────────────────────────

export { useSectionSelection } from './selection'

// ── components ──────────────────────────────────────────────────────────────

export {
	BulkActionBar,
	type BulkActionBarProps,
	BulkActionConfirmDialog,
	BulkCommandMenuAction,
	showBulkActionResultToast,
} from './components'
