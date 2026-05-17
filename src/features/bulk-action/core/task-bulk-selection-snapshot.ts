import type { CommandSelectionContext } from '@/features/command/core'

import type { BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

export function createTaskBulkSelectionSnapshot(
	selection: CommandSelectionContext,
	source: BulkSelectionSource,
) {
	const taskEntities = selection.entities.filter((entity) => entity.type === 'task')

	return createBulkSelectionSnapshot({
		entity: 'task',
		ids: taskEntities.map((entity) => entity.id),
		entities: taskEntities.map((entity) => ({
			id: entity.id,
			title: entity.title,
			subtitle: entity.subtitle,
			status: entity.status,
			priority: entity.priority,
		})),
		source,
	})
}
