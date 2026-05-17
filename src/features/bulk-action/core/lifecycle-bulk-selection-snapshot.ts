import type { LifecycleEntry } from '@/shared/types'

import type { BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

export function createLifecycleBulkSelectionSnapshot(
	entries: LifecycleEntry[],
	source: BulkSelectionSource,
) {
	return createBulkSelectionSnapshot({
		entity: 'lifecycle',
		ids: entries.map((entry) => entry.id),
		entities: entries.map((entry) => ({
			id: entry.id,
			title: entry.title,
			subtitle: getLifecycleEntrySubtitle(entry),
		})),
		source,
	})
}

function getLifecycleEntrySubtitle(entry: LifecycleEntry) {
	if (entry.entityType === 'space') {
		return '空间'
	}

	if (entry.entityType === 'project') {
		return entry.spaceName ? `项目 · ${entry.spaceName}` : '项目'
	}

	return entry.projectName ?? entry.spaceName ?? '任务'
}
