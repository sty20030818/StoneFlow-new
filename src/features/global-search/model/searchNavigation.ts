import { buildScopedProjectPath, buildScopedSectionPath } from '@/app/routing'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'

export function resolveProjectSearchTargetPath(project: SearchProjectItem) {
	return buildScopedProjectPath({ type: 'space', spaceId: project.spaceId }, project.id)
}

export function resolveTaskSearchTargetPath(task: SearchTaskItem) {
	if (task.projectId) {
		return buildScopedProjectPath({ type: 'space', spaceId: task.spaceId }, task.projectId)
	}

	if (task.inboxAt) {
		return buildScopedSectionPath({ type: 'space', spaceId: task.spaceId }, 'inbox')
	}

	return buildScopedSectionPath({ type: 'space', spaceId: task.spaceId }, 'no-project')
}
