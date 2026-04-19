export type ProjectTaskStatus = 'todo' | 'done'

export type ProjectRecord = {
	id: string
	name: string
	status: string
	sortOrder: number
}

export type ProjectExecutionTask = {
	id: string
	title: string
	note: string | null
	priority: string
	status: ProjectTaskStatus
	completedAt: string | null
	updatedAt: string
}

export type ProjectExecutionView = {
	project: ProjectRecord
	tasks: ProjectExecutionTask[]
}
