import type { TaskStatus } from './task'
import type { TaskPriority } from './taskPriority'

export type SearchTaskItem = {
	id: string
	spaceId: string
	spaceName: string
	spaceSlug: string
	projectId: string | null
	title: string
	note: string | null
	priority: TaskPriority
	status: TaskStatus
	projectName: string | null
	updatedAt: string
	completedAt: string | null
}

export type SearchProjectItem = {
	id: string
	spaceId: string
	spaceName: string
	spaceSlug: string
	name: string
	note: string | null
	updatedAt: string
	completedAt: string | null
}

export type SearchEntitiesResult = {
	tasks: SearchTaskItem[]
	projects: SearchProjectItem[]
	completedTasks: SearchTaskItem[]
	completedProjects: SearchProjectItem[]
}
