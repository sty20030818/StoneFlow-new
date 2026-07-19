import type {
	TaskCreatePlacementInput,
	TaskDetail,
	TaskListItem,
	TaskPlacement,
} from '@/shared/types'

type TaskPlacementLike = Pick<TaskListItem, 'projectId'> & Partial<Pick<TaskDetail, 'inboxAt'>>

export function getTaskPlacement(task: TaskPlacementLike): TaskPlacement {
	if (task.projectId) {
		return 'project'
	}

	if (task.inboxAt) {
		return 'inbox'
	}

	return 'noProject'
}

export function formatTaskPlacementLabel(placement: TaskPlacement) {
	switch (placement) {
		case 'inbox':
			return '收件箱'
		case 'noProject':
			return '独立事项'
		case 'project':
			return '项目'
		default:
			return '任务'
	}
}

export function buildCreatePlacementInput(
	placement: TaskPlacement,
	projectId: string | null,
): TaskCreatePlacementInput {
	if (placement === 'project') {
		return {
			kind: 'project',
			projectId: projectId ?? '',
		}
	}

	if (placement === 'noProject') {
		return { kind: 'noProject' }
	}

	return { kind: 'inbox' }
}
