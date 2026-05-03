import type { TaskCreatePlacementInput, TaskDetail, TaskListItem, TaskPlacement } from '@/shared/types'

type TaskPlacementLike = Pick<TaskListItem, 'projectId'> & Partial<Pick<TaskDetail, 'inboxAt'>>

export const TASK_CREATE_PLACEMENT_OPTIONS: Array<{
	value: TaskPlacement
	label: string
	description: string
}> = [
	{
		value: 'inbox',
		label: '进入 Inbox',
		description: '先捕获，稍后再补项目归属。',
	},
	{
		value: 'noProject',
		label: 'No Project',
		description: '明确不归属任何项目，直接离开 Inbox。',
	},
	{
		value: 'project',
		label: '具体 Project',
		description: '直接归属到选中的项目。',
	},
]

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
			return 'Inbox'
		case 'noProject':
			return 'No Project'
		case 'project':
			return 'Project'
		default:
			return 'Task'
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
