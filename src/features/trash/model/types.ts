export type TrashEntityType = 'task' | 'project'

export type TrashEntry = {
	id: string
	entityType: TrashEntityType
	entityId: string
	title: string
	deletedAt: string
	deletedFrom: string | null
	restoreHint: string
	originalProjectId: string | null
	originalParentProjectId: string | null
}

export type TrashList = {
	entries: TrashEntry[]
}

export type RestoredTrashEntry = {
	trashEntryId: string
	entityType: TrashEntityType
	entityId: string
}

export type DeletedProjectToTrash = {
	projectId: string
	deletedAt: string
}
