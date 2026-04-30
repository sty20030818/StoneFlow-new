export type Project = {
	id: string
	spaceId: string
	name: string
	description: string | null
	dueAt: string | null
	sortOrder: number
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
	sortOrder: number
	taskCount: number
	activeTaskCount: number
	completedAt: string | null
	updatedAt: string
}
