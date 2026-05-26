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
