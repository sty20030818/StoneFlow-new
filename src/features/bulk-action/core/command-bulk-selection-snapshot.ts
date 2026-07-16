import type { CommandSelectionContext } from '@/features/command'

import type { BulkEntityType, BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

export function createCommandBulkSelectionSnapshot(
	selection: CommandSelectionContext,
	entity: BulkEntityType,
	source: BulkSelectionSource,
) {
	const entities = selection.entities.filter((item) => item.type === entity)

	return createBulkSelectionSnapshot({
		entity,
		ids: entities.map((item) => item.id),
		entities: entities.map((item) => ({
			id: item.id,
			title: item.title,
			subtitle: item.subtitle,
			status: item.status,
			priority: item.priority,
		})),
		source,
	})
}
