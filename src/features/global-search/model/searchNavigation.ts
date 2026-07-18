import { openProjectDetail } from '@/app/navigation'
import type { SearchProjectItem } from '@/shared/types'

export function resolveProjectSearchTargetPath(project: SearchProjectItem) {
	return openProjectDetail(project.id, {
		scope: { type: 'space', spaceId: project.spaceId },
	})
}
