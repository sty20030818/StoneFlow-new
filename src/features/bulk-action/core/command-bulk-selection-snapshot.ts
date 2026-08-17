import type { CommandSelectionContext } from '@/features/command'

import type { BulkEntityType, BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

export function createCommandBulkSelectionSnapshot(
	selection: CommandSelectionContext,
	entity: BulkEntityType,
	source: BulkSelectionSource,
) {
	const entityById = new Map(
		selection.entities.filter((item) => item.type === entity).map((item) => [item.id, item]),
	)
	const entities = selection.ids.flatMap((id) => {
		const item = entityById.get(id)
		return item
			? [
					{
						id: item.id,
						title: item.title,
						subtitle: item.subtitle,
						status: item.status,
						priority: item.priority,
					},
				]
			: []
	})

	return createBulkSelectionSnapshot({
		entity,
		ids: selection.ids,
		entities,
		source,
	})
}
