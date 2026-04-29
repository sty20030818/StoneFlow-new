export type TrashEntry = {
	id: string
	entityType: 'task' | 'project'
	title: string
	deletedAt: string
	deletedFrom?: string
	restoreHint: string
}
