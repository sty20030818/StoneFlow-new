import { useEntitySelection } from '@/features/selection'

/**
 * 为任务列表提供最小可用的本地选择状态，并在数据刷新后自动剔除失效项。
 */
export function useTaskSelection(taskIds: string[]) {
	const selection = useEntitySelection(taskIds)

	return {
		selectedTaskIds: selection.selectedIds,
		selectedTaskIdSet: selection.selectedIdSet,
		selectionSnapshot: {
			...selection.selectionSnapshot,
			type: 'task' as const,
		},
		selectedCount: selection.selectedCount,
		focusedTaskId: selection.focusedId,
		focusedTaskIndex: selection.focusedIndex,
		selectionAnchorId: selection.selectionAnchorId,
		setFocusedTaskId: selection.setFocusedId,
		moveFocus: selection.moveFocus,
		rangeSelectTo: selection.rangeSelectTo,
		selectOnly: selection.selectOnly,
		toggleTaskSelection: selection.toggleSelection,
		clearTaskSelection: selection.clearSelection,
		selectTaskIds: selection.selectIds,
		selectAllTasks: selection.selectAll,
	}
}
