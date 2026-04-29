import type { TaskPriority } from './taskPriority'

export type SearchTaskItem = {
	id: string
	title: string
	note: string | null
	priority: TaskPriority
	projectName: string | null
}

export type SearchProjectItem = {
	id: string
	name: string
	note: string | null
	status: string
}
