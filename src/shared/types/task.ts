import type { TaskPriority } from './taskPriority'

export type TaskStatus = 'todo' | 'done'

export type Task = {
	id: string
	title: string
	note: string | null
	priority: TaskPriority
	status: TaskStatus
	projectId: string | null
	projectName: string | null
	pinned: boolean
}

export type TaskView = Task & {
	dueLabel: string | null
	completedLabel: string | null
	createdLabel: string
	updatedLabel: string
	viewKeys: string[]
}
