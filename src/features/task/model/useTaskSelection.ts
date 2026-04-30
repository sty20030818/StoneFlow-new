import { useEffect, useMemo, useState } from 'react'

/**
 * 为任务列表提供最小可用的本地选择状态，并在数据刷新后自动剔除失效项。
 */
export function useTaskSelection(taskIds: string[]) {
	const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
	const taskIdSignature = taskIds.join('\u0000')

	useEffect(() => {
		const nextTaskIdSet = new Set(taskIds)

		setSelectedTaskIds((currentIds) => {
			const nextSelectedTaskIds = currentIds.filter((taskId) => nextTaskIdSet.has(taskId))

			if (
				nextSelectedTaskIds.length === currentIds.length &&
				nextSelectedTaskIds.every((taskId, index) => taskId === currentIds[index])
			) {
				return currentIds
			}

			return nextSelectedTaskIds
		})
	}, [taskIdSignature, taskIds])

	const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])
	const selectedCount = selectedTaskIds.length

	function toggleTaskSelection(taskId: string) {
		setSelectedTaskIds((currentIds) =>
			currentIds.includes(taskId)
				? currentIds.filter((currentTaskId) => currentTaskId !== taskId)
				: [...currentIds, taskId],
		)
	}

	function clearTaskSelection() {
		setSelectedTaskIds((currentIds) => (currentIds.length === 0 ? currentIds : []))
	}

	return {
		selectedTaskIds,
		selectedTaskIdSet,
		selectedCount,
		toggleTaskSelection,
		clearTaskSelection,
	}
}
