import type { Project, ProjectOverviewItem, ProjectSidebarItem } from '@/shared/types'
import type { TaskStatus } from '@/shared/types'

export type ProjectOverviewViewKey = 'active' | 'completed' | 'archived' | 'all'

export type ProjectDetail = Project & {
	spaceName: string
	taskCount: number
	activeTaskCount: number
}

export type ProjectOption = {
	id: string
	name: string
}

export type ProjectExecutionTask = {
	id: string
	title: string
	note: string | null
	priority: string
	status: TaskStatus
	tags?: string[]
	dueAt: string | null
	completedAt: string | null
	createdAt: string
	updatedAt: string
}

export type ProjectFormInput = {
	spaceId: string
	name: string
	description?: string | null
	dueAt?: string | null
}

export type ProjectUpdateInput = {
	projectId: string
	name?: string
	description?: string | null
	dueAt?: string | null
	sortOrder?: number
}

export type { Project, ProjectOverviewItem, ProjectSidebarItem }
