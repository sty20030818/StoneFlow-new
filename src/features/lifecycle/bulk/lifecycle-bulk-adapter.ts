import { emitEvent } from '@/shared/events'
import type { LifecycleEntry } from '@/shared/types'

import {
	deleteLifecycleEntry as deleteLifecycleEntryApi,
	permanentlyDeleteLifecycleEntry as permanentlyDeleteLifecycleEntryApi,
	restoreLifecycleEntry as restoreLifecycleEntryApi,
} from '../api/lifecycle'

export type LifecycleBulkMutationReport = {
	requestedIds: string[]
	succeededIds: string[]
	failedIds: string[]
	skippedIds: string[]
}

export type LifecycleBulkAdapter = {
	restore: (ids: string[]) => Promise<LifecycleBulkMutationReport>
	deleteLifecycle: (ids: string[]) => Promise<LifecycleBulkMutationReport>
	deletePermanently: (ids: string[]) => Promise<LifecycleBulkMutationReport>
}

type LifecycleBulkAdapterOptions = {
	entries: LifecycleEntry[] | (() => Promise<LifecycleEntry[]>)
	restoreLifecycleEntry?: typeof restoreLifecycleEntryApi
	deleteLifecycleEntry?: typeof deleteLifecycleEntryApi
	permanentlyDeleteLifecycleEntry?: typeof permanentlyDeleteLifecycleEntryApi
	refreshLoadedSlices: () => Promise<void>
}

export function createLifecycleBulkAdapter({
	deleteLifecycleEntry = deleteLifecycleEntryApi,
	entries,
	permanentlyDeleteLifecycleEntry = permanentlyDeleteLifecycleEntryApi,
	refreshLoadedSlices,
	restoreLifecycleEntry = restoreLifecycleEntryApi,
}: LifecycleBulkAdapterOptions): LifecycleBulkAdapter {
	async function resolveEntryById() {
		const resolvedEntries = typeof entries === 'function' ? await entries() : entries
		return new Map(resolvedEntries.map((entry) => [entry.id, entry]))
	}

	async function runLifecycleBulkMutation({
		ids,
		operation,
		mutate,
	}: {
		ids: string[]
		operation: 'restore' | 'delete'
		mutate: (entry: LifecycleEntry) => Promise<unknown>
	}): Promise<LifecycleBulkMutationReport> {
		const succeededIds: string[] = []
		const failedIds: string[] = []
		const skippedIds: string[] = []
		const entryById = await resolveEntryById()

		for (const entryId of ids) {
			const entry = entryById.get(entryId)
			if (!entry) {
				skippedIds.push(entryId)
				continue
			}

			try {
				await mutate(entry)
				succeededIds.push(entryId)
				emitLifecycleMutationEvents(entry, operation)
			} catch {
				failedIds.push(entryId)
			}
		}

		if (succeededIds.length > 0) {
			await refreshLoadedSlices()
		}

		return {
			requestedIds: [...ids],
			succeededIds,
			failedIds,
			skippedIds,
		}
	}

	return {
		restore: (ids) =>
			runLifecycleBulkMutation({
				ids,
				operation: 'restore',
				mutate: restoreLifecycleEntry,
			}),
		deleteLifecycle: (ids) =>
			runLifecycleBulkMutation({
				ids,
				operation: 'delete',
				mutate: deleteLifecycleEntry,
			}),
		deletePermanently: (ids) =>
			runLifecycleBulkMutation({
				ids,
				operation: 'delete',
				mutate: permanentlyDeleteLifecycleEntry,
			}),
	}
}

function emitLifecycleMutationEvents(entry: LifecycleEntry, operation: 'restore' | 'delete') {
	if (entry.entityType === 'space') {
		emitEvent({
			type: operation === 'delete' ? 'space:deleted' : 'space:updated',
			payload: { spaceId: entry.id },
		})
	} else if (entry.entityType === 'project') {
		emitEvent({
			type: operation === 'delete' ? 'project:deleted' : 'project:updated',
			payload: { projectId: entry.id },
		})
	} else {
		emitEvent({
			type: operation === 'delete' ? 'task:deleted' : 'task:updated',
			payload: { taskId: entry.id },
		})
	}

	emitEvent({
		type: 'lifecycle:changed',
		payload: {
			entityType: entry.entityType,
			entityId: entry.id,
			operation,
		},
	})
}
