export type FocusViewKey = 'focus' | 'upcoming' | 'recent' | 'high_priority'

export type FocusViewRecord = {
	id: string
	key: FocusViewKey
	name: string
	sortOrder: number
	isEnabled: boolean
}

export type FocusTaskRecord = {
	id: string
	projectId: string
	title: string
	note: string | null
	priority: string
	status: 'todo' | 'done'
	pinned: boolean
	dueAt: string | null
	createdAt: string
	updatedAt: string
}

export type FocusViewSnapshot = {
	view: FocusViewRecord
	tasks: FocusTaskRecord[]
}
