import { useTaskRowShortcutController } from './useTaskRowShortcutController'
import type { TaskRowShortcutScopeProps } from './types'

export type { TaskRowInteractionState, TaskRowShortcutState } from './types'

/**
 * 任务行快捷键作用域：Provider 壳，绑定逻辑在 {@link useTaskRowShortcutController}。
 *
 * complete/archive/delete 经 runTaskRowBulkCommand，与命令板同源。
 */
export function TaskRowShortcutScope({
	children,
	tasks,
	activeTaskId,
	focusedTaskId = null,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onMoveTaskFocus: _onMoveTaskFocus,
	onSetFocusedTask,
	onClearTaskSelection,
	onSelectAllTasks,
	onOpenTask,
	onPeekTask,
}: TaskRowShortcutScopeProps) {
	const state = useTaskRowShortcutController({
		tasks,
		activeTaskId,
		focusedTaskId,
		selectedTaskIdSet,
		onToggleTaskSelection,
		onSetFocusedTask,
		onClearTaskSelection,
		onSelectAllTasks,
		onOpenTask,
		onPeekTask,
	})

	return <>{children(state)}</>
}
