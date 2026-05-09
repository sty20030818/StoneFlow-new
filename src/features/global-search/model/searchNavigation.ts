import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'

export function resolveProjectSearchTargetPath(project: SearchProjectItem) {
	return `/space/${project.spaceId}/project/${project.id}`
}

export function resolveTaskSearchTargetPath(task: SearchTaskItem) {
	if (task.projectId) {
		return `/space/${task.spaceId}/project/${task.projectId}`
	}

	if (task.inboxAt) {
		return `/space/${task.spaceId}/inbox`
	}

	return `/space/${task.spaceId}/no-project`
}
