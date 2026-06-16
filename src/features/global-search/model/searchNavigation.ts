import { buildCanonicalProjectPath, buildTaskDetailPath } from '@/app/routing'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'

export function resolveProjectSearchTargetPath(project: SearchProjectItem) {
	return buildCanonicalProjectPath({ type: 'space', spaceId: project.spaceId }, project.id)
}

export function resolveTaskSearchTargetPath(task: SearchTaskItem) {
	return buildTaskDetailPath(task.spaceId, task.id)
}
