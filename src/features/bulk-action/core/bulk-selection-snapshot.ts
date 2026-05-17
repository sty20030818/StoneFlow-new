import type { BulkSelectionEntity, BulkSelectionSnapshot } from './bulk-action.types'

type CreateBulkSelectionSnapshotInput = Omit<
	BulkSelectionSnapshot,
	'ids' | 'entities' | 'createdAt'
> & {
	ids: readonly string[]
	entities?: readonly BulkSelectionEntity[]
	createdAt?: number
}

export function createBulkSelectionSnapshot({
	entity,
	ids,
	entities,
	source,
	createdAt = Date.now(),
}: CreateBulkSelectionSnapshotInput): BulkSelectionSnapshot {
	return {
		entity,
		ids: [...ids],
		entities: entities?.map((item) => ({ ...item })),
		source,
		createdAt,
	}
}
