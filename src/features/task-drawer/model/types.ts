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

export type TaskDrawerResourceType = 'doc_link' | 'local_file' | 'local_folder'

export type TaskDrawerResource = {
	id: string
	taskId: string
	type: TaskDrawerResourceType
	title: string
	target: string
	sortOrder: number
	createdAt: string
	updatedAt: string
}

export type TaskDrawerDetail = {
	task: TaskDrawerTask
	projects: TaskDrawerProjectOption[]
	resources: TaskDrawerResource[]
}

export type DeletedTaskResult = {
	taskId: string
	deletedAt: string
}

export type CreatedTaskResourceResult = {
	resource: TaskDrawerResource
}

export type DeletedTaskResourceResult = {
	resourceId: string
}

export type OpenedTaskResourceResult = {
	resourceId: string
}
