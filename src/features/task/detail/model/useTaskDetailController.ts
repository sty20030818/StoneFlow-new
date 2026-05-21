import { useEffect } from 'react'

import { useDangerConfirm } from '@/features/danger-confirm'
import { selectTaskDetail, useTaskStore } from '@/features/task/model/useTaskStore'

export function useTaskDetailController(taskId: string) {
	const detail = useTaskStore(selectTaskDetail)
	const loadDetail = useTaskStore((state) => state.loadDetail)
	const clearDetail = useTaskStore((state) => state.clearDetail)
	const archiveTask = useTaskStore((state) => state.archiveTask)
	const restoreTask = useTaskStore((state) => state.restoreTask)
	const deleteTask = useTaskStore((state) => state.deleteTask)
	const { requestDangerConfirm } = useDangerConfirm()

	useEffect(() => {
		void loadDetail(taskId)
		return () => {
			clearDetail()
		}
	}, [clearDetail, loadDetail, taskId])

	async function archiveOrRestore() {
		if (!detail.item) {
			return
		}

		if (detail.item.archivedAt) {
			await restoreTask(detail.item.id)
			return
		}

		const confirmed = await requestDangerConfirm({
			intent: 'archive',
			entityType: 'task',
			count: 1,
			entityLabel: detail.item.title,
		})

		if (!confirmed) {
			return
		}

		await archiveTask(detail.item.id)
	}

	async function moveToTrash() {
		if (!detail.item) {
			return
		}

		const confirmed = await requestDangerConfirm({
			intent: 'trash',
			entityType: 'task',
			count: 1,
			entityLabel: detail.item.title,
		})

		if (!confirmed) {
			return
		}

		await deleteTask(detail.item.id)
	}

	return {
		task: detail.item?.id === taskId ? detail.item : null,
		status: detail.status,
		error: detail.error,
		archiveOrRestore,
		moveToTrash,
	}
}
