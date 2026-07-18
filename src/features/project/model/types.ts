import type { Project, ProjectOverviewItem, ProjectSidebarItem } from '@/shared/types'

export type ProjectOverviewViewKey =
	| 'active'
	| 'completed'
	| 'archived'
	| 'all'
	| 'active_projects'
	| 'completed_projects'
	| 'archived_projects'
	| 'all_projects'

export type ProjectDetail = Project & {
	spaceName: string
	taskCount: number
	activeTaskCount: number
}

export type ProjectOption = {
	id: string
	spaceId: string
	name: string
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
