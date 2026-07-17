export type TaskPlacementTarget =
	| {
			kind: 'inbox'
			spaceId: string
	  }
	| {
			kind: 'no_project'
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
		case 'inbox':
			return `inbox:${target.spaceId}`
		default:
			return `no_project:${target.spaceId}`
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
	inboxAt?: string | null
}): TaskPlacementTarget {
	if (input.projectId) {
		return {
			kind: 'project',
			projectId: input.projectId,
			spaceId: input.spaceId,
		}
	}

	if (input.inboxAt) {
		return {
			kind: 'inbox',
			spaceId: input.spaceId,
		}
	}

	return {
		kind: 'no_project',
		spaceId: input.spaceId,
	}
}
