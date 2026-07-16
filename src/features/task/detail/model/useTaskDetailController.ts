import { useDangerConfirm } from '@/features/danger-confirm'
import {
	useArchiveTaskMutation,
	useDeleteTaskMutation,
	useRestoreTaskMutation,
	useTaskDetailData,
} from '@/features/task/hooks'

export function useTaskDetailController(taskId: string) {
	const detail = useTaskDetailData(taskId)
	const archiveTask = useArchiveTaskMutation()
	const restoreTask = useRestoreTaskMutation()
	const deleteTask = useDeleteTaskMutation()
	const { requestDangerConfirm } = useDangerConfirm()

	async function archiveOrRestore() {
		if (!detail.item) {
			return
		}

		if (detail.item.archivedAt) {
			await restoreTask.mutateAsync(detail.item.id)
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

		await archiveTask.mutateAsync(detail.item.id)
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

		await deleteTask.mutateAsync(detail.item.id)
	}

	return {
		task: detail.item?.id === taskId ? detail.item : null,
		status: detail.status,
		error: detail.error,
		archiveOrRestore,
		moveToTrash,
	}
}
