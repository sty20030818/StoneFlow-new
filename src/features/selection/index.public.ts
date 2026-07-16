/**
 * @fileoverview **selection · 唯一对外公共面**
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

// ── 构建命令选中快照 ────────────────────────────────────────────────────────

export {
	buildTaskCommandSelection,
	buildProjectCommandSelection,
	buildLifecycleCommandSelection,
} from './model/commandSelection'

// ── 实体列表选择 ────────────────────────────────────────────────────────────

/** 通用实体多选 / 焦点（task/project/lifecycle 列表）。 */
export { useEntitySelection } from './model/useEntitySelection'

/** Escape 清空选择。 */
export { useEntitySelectionEscape } from './model/useEntitySelectionEscape'

// ── 行快捷键作用域 ──────────────────────────────────────────────────────────

/**
 * 看板行级键盘/指针 hover-focus 作用域。
 * board 组件渲染行时使用。
 */
export {
	EntityRowShortcutScope,
	type EntityRowShortcutState,
} from './components/EntityRowShortcutScope'
