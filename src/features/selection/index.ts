/**
 * @fileoverview **selection · 唯一对外公共面（`@/features/selection`）**
 *
 * Collection 交互 / 命令选中注册。壳装配 Provider，列表页注册只读 selection 投影。
 *
 * 外模块：`import { … } from '@/features/selection'`
 * 禁止：`@/features/selection/model|components/…`
 */

// ── 壳装配 ──────────────────────────────────────────────────────────────────

/** 命令菜单当前选中上下文 Provider（挂 layout ShellProviders）。 */
export {
	CommandSelectionProvider,
	useCommandSelectionContext,
	useRegisterCommandSelection,
} from './model/CommandSelectionProvider'

// 域 selection 快照 builder 已迁至 task/project/lifecycle public

// ── 实体列表选择 ────────────────────────────────────────────────────────────

export {
	createCollectionFocusBridge,
	createCollectionProjection,
	reconcileCollapsedGroup,
	reconcileCollectionProjection,
	useCollectionInteraction,
	useGroupedCollectionInteraction,
} from './model'
export type {
	CollectionEntryTarget,
	CollectionFocusIntent,
	CollectionInteraction,
	CollectionKey,
	CollectionProjection,
	CollectionState,
	CollectionTransition,
	CollectionGroup,
	GroupedCollectionInteraction,
} from './model'

export {
	CollectionGridRoot,
	CollectionGridGroupTrigger,
	CollectionGridRow,
	type CollectionGridRootState,
} from './components/CollectionGrid'

/** 由 AppProviders 在组合根注入统一 KeybindingRegistry。 */
export { SELECTION_SHORTCUT_BINDINGS, useCollectionKeyboardAdapter } from './shortcuts'
