import { openProjectDetail, openTaskDetail } from '@/app/navigation/intents'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'

export function resolveProjectSearchTargetPath(project: SearchProjectItem) {
	return openProjectDetail(project.id, {
		scope: { type: 'space', spaceId: project.spaceId },
	})
}

export function resolveTaskSearchTargetPath(task: SearchTaskItem) {
	return openTaskDetail(task.id, task.spaceId)
}
