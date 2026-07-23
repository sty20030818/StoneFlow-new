import type { TaskUpdatePlacementInput } from '@/shared/types'

/**
 * UI / 批量 / 详情归属目标。
 * 与 update_task placement 契约同形，不再做二次转换。
 */
export type TaskPlacementTarget = TaskUpdatePlacementInput

export function getTaskPlacementTargetValue(target: TaskPlacementTarget) {
	return target.kind === 'project'
		? `project:${target.projectId}`
		: `standalone:${target.spaceId}`
}

export function isTaskPlacementTargetEqual(left: TaskPlacementTarget, right: TaskPlacementTarget) {
	if (left.kind !== right.kind) {
		return false
	}

	if (left.kind === 'project' && right.kind === 'project') {
		return left.projectId === right.projectId && left.spaceId === right.spaceId
	}

	return left.spaceId === right.spaceId
}

export function resolveTaskPlacementTarget(input: {
	spaceId: string
	projectId?: string | null
}): TaskPlacementTarget {
	if (input.projectId) {
		return {
			kind: 'project',
			projectId: input.projectId,
			spaceId: input.spaceId,
		}
	}

	return {
		kind: 'standalone',
		spaceId: input.spaceId,
	}
}
