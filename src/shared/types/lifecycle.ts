import type { Scope } from './space'

export type LifecycleEntityType = 'space' | 'project' | 'task'
export type LifecycleMode = 'archive' | 'trash'

export type LifecycleEntry = {
	id: string
	entityType: LifecycleEntityType
	title: string
	spaceId: string | null
	spaceName: string | null
	projectId: string | null
	projectName: string | null
	archivedAt: string | null
	deletedAt: string | null
	sourceType: string | null
	sourceId: string | null
	restoreHint: string
}

export type ListLifecycleEntriesInput = {
	mode: LifecycleMode
	scope: Scope
	entityFilter?: LifecycleEntityType
}
