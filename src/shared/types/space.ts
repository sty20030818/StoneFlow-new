export type Space = {
	id: string
	name: string
	iconKey: string
	colorKey: string
	isDefault: boolean
	position: number
	archivedAt: string | null
	deletedAt: string | null
	createdAt: string
	updatedAt: string
}

export type Scope =
	| {
			type: 'all'
	  }
	| {
			type: 'space'
			spaceId: string
	  }
