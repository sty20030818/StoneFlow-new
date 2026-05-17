import type { TaskListItem, TaskStatus } from '@/shared/types'

export const TASK_BOARD_STATUS_ORDER: readonly TaskStatus[] = [
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

export const ACTIVE_TASK_BOARD_STATUS_ORDER = TASK_BOARD_STATUS_ORDER.filter((status) =>
	['todo', 'doing', 'waiting'].includes(status),
)

type TaskBoardCustomSection = {
	tasks: TaskListItem[]
}

type TaskBoardOrderOptions = {
	statusOrder?: readonly TaskStatus[]
	customSections?: readonly TaskBoardCustomSection[] | undefined
}

export function orderTasksByTaskBoardVisualOrder(
	tasks: readonly TaskListItem[],
	{ statusOrder = TASK_BOARD_STATUS_ORDER, customSections }: TaskBoardOrderOptions = {},
) {
	if (customSections && customSections.length > 0) {
		return customSections.flatMap((section) => section.tasks)
	}

	const statusRank = new Map(statusOrder.map((status, index) => [status, index]))
	return [...tasks].sort((left, right) => {
		const leftRank = statusRank.get(left.status) ?? statusOrder.length
		const rightRank = statusRank.get(right.status) ?? statusOrder.length

		return leftRank - rightRank
	})
}

export function getTaskBoardVisualOrderIds(
	tasks: readonly TaskListItem[],
	options?: TaskBoardOrderOptions,
) {
	return orderTasksByTaskBoardVisualOrder(tasks, options).map((task) => task.id)
}
