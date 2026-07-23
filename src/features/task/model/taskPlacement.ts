import type { TaskCreatePlacementInput, TaskPlacement } from '@/shared/types'

import type { TaskPlacementTarget } from './taskPlacementTarget'
import { resolveTaskPlacementTarget } from './taskPlacementTarget'

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

/** 创建草稿字段 → 菜单 Target（project 且无 id 时落到独立事项）。 */
export function targetFromPlacementDraft(
	placement: TaskPlacement,
	spaceId: string,
	projectId: string | null,
): TaskPlacementTarget {
	return resolveTaskPlacementTarget({
		spaceId,
		projectId: placement === 'project' ? projectId : null,
	})
}

/** 菜单 Target → 创建草稿字段。 */
export function placementDraftFromTarget(target: TaskPlacementTarget): {
	placement: TaskPlacement
	projectId: string | null
} {
	if (target.kind === 'project') {
		return { placement: 'project', projectId: target.projectId }
	}

	return { placement: 'standalone', projectId: null }
}
