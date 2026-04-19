export type TaskDrawerStatus = 'todo' | 'done'

export type TaskDrawerProjectOption = {
	id: string
	name: string
	sortOrder: number
}

export type TaskDrawerTask = {
	id: string
	title: string
	note: string | null
	priority: string | null
	projectId: string | null
	status: TaskDrawerStatus
	createdAt: string
	updatedAt: string
	completedAt: string | null
}

export type TaskDrawerDetail = {
	task: TaskDrawerTask
	projects: TaskDrawerProjectOption[]
}

export type DeletedTaskResult = {
	taskId: string
	deletedAt: string
}
