import type {
	TaskCreatePlacementInput,
	TaskDetail,
	TaskListItem,
	TaskPlacement,
} from '@/shared/types'

type TaskPlacementLike = Pick<TaskListItem, 'projectId'> & Partial<Pick<TaskDetail, 'projectId'>>

export function getTaskPlacement(task: TaskPlacementLike): TaskPlacement {
	if (task.projectId) {
		return 'project'
	}

	return 'standalone'
}

export function formatTaskPlacementLabel(placement: TaskPlacement) {
	switch (placement) {
		case 'standalone':
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

	return { kind: 'standalone' }
}
