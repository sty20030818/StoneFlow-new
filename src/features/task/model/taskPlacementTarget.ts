export type TaskPlacementTarget =
	| {
			kind: 'standalone'
			spaceId: string
	  }
	| {
			kind: 'project'
			projectId: string
			spaceId: string
	  }

export function getTaskPlacementTargetValue(target: TaskPlacementTarget) {
	switch (target.kind) {
		case 'project':
			return `project:${target.projectId}`
		default:
			return `standalone:${target.spaceId}`
	}
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
