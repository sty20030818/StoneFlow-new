import type { TaskPriority } from './taskPriority'
import type { TaskStatus } from './task'

export type Project = {
	id: string
	spaceId: string
	name: string
	description: string | null
	status: TaskStatus
	priority: TaskPriority
	plannedAt: string | null
	dueAt: string | null
	remindAt: string | null
	statusChangedAt: string
	position: number
	completedAt: string | null
	archivedAt: string | null
	deletedAt: string | null
	createdAt: string
	updatedAt: string
}

export type ProjectOverviewItem = Project & {
	spaceName: string
	taskCount: number
	activeTaskCount: number
}

export type ProjectSidebarItem = {
	id: string
	spaceId: string
	name: string
	position: number
	taskCount: number
	activeTaskCount: number
	completedAt: string | null
	updatedAt: string
}
