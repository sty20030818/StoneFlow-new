export type ProjectStatus = 'active' | 'draft'

export type Project = {
	id: string
	name: string
	note: string
	status: ProjectStatus
	parentProjectId: string | null
	sortOrder: number
}

export type ProjectTreeNode = Project & {
	children: ProjectTreeNode[]
}
