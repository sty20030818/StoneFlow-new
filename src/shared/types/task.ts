import type { Scope } from './space'
import type { TaskPriority } from './taskPriority'

export type TaskStatus = 'todo' | 'doing' | 'waiting' | 'done' | 'canceled'

export type TaskListViewKey = 'active' | 'completed' | 'canceled' | 'archived' | 'all'

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

export type TaskListItem = {
	id: string
	spaceId: string
	spaceName: string
	spaceSlug: string
	projectId: string | null
	projectName: string | null
	title: string
	note: string | null
	status: TaskStatus
	statusChangedAt: string
	priority: TaskPriority
	dueAt: string | null
	scheduledAt: string | null
	reminderAt: string | null
	completedAt: string | null
	canceledAt: string | null
	archivedAt: string | null
	createdAt: string
	updatedAt: string
}

export type TaskDetail = TaskListItem & {
	inboxAt: string | null
	sortOrder: number
	deletedAt: string | null
}

export type ListTasksInput = {
	scope: Scope
	viewKey: TaskListViewKey
	projectId?: string | null
}

export type CreateTaskInput = {
	spaceId?: string | null
	projectId?: string | null
	title: string
	note?: string | null
	status?: TaskStatus | null
	priority?: TaskPriority | null
	dueAt?: string | null
	scheduledAt?: string | null
	reminderAt?: string | null
}

export type UpdateTaskInput = {
	taskId: string
	title?: string
	note?: string | null
	status?: TaskStatus
	priority?: TaskPriority
	spaceId?: string
	projectId?: string | null
	dueAt?: string | null
	scheduledAt?: string | null
	reminderAt?: string | null
}
