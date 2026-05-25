import { buildCanonicalProjectPath, buildCanonicalSectionPath } from '@/app/routing'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'

export function resolveProjectSearchTargetPath(project: SearchProjectItem) {
	return buildCanonicalProjectPath({ type: 'space', spaceId: project.spaceId }, project.id)
}

export function resolveTaskSearchTargetPath(task: SearchTaskItem) {
	if (task.projectId) {
		return buildCanonicalProjectPath({ type: 'space', spaceId: task.spaceId }, task.projectId)
	}

	if (task.inboxAt) {
		return buildCanonicalSectionPath({ type: 'space', spaceId: task.spaceId }, 'inbox')
	}

	return buildCanonicalSectionPath({ type: 'space', spaceId: task.spaceId }, 'no-project')
}
