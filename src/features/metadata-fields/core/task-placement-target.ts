export type TaskPlacementTarget =
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
	return target.kind === 'project' ? `project:${target.projectId}` : `no_project:${target.spaceId}`
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
