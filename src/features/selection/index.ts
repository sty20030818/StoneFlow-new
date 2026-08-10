/**
 * @fileoverview **selection · 唯一对外公共面（`@/features/selection`）**
 *
 * 选择 / 命令选中注册 / 行快捷键作用域。壳装配 Provider，列表页注册 selection。
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

/** 通用实体多选 / 焦点（task/project/lifecycle 列表）。 */
export { useEntitySelection } from './model/useEntitySelection'

// ── 行快捷键作用域 ──────────────────────────────────────────────────────────

/**
 * 看板行级键盘/指针 hover-focus 作用域。
 * board 组件渲染行时使用。
 */
export {
	EntityRowShortcutScope,
	type EntityRowShortcutState,
} from './components/EntityRowShortcutScope'

/** 由 AppProviders 在组合根注入统一 KeybindingRegistry。 */
export { SELECTION_SHORTCUT_BINDINGS } from './shortcuts'
