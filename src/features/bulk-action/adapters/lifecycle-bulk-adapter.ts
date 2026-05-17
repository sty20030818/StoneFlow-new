import {
	deleteLifecycleEntry as deleteLifecycleEntryApi,
	permanentlyDeleteLifecycleEntry as permanentlyDeleteLifecycleEntryApi,
	restoreLifecycleEntry as restoreLifecycleEntryApi,
} from '@/features/lifecycle/api/lifecycle'
import type { LifecycleEntry } from '@/shared/types'

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
	entries: LifecycleEntry[]
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
	const entryById = new Map(entries.map((entry) => [entry.id, entry]))

	async function runLifecycleBulkMutation({
		ids,
		mutate,
	}: {
		ids: string[]
		mutate: (entry: LifecycleEntry) => Promise<unknown>
	}): Promise<LifecycleBulkMutationReport> {
		const succeededIds: string[] = []
		const failedIds: string[] = []
		const skippedIds: string[] = []

		for (const entryId of ids) {
			const entry = entryById.get(entryId)
			if (!entry) {
				skippedIds.push(entryId)
				continue
			}

			try {
				await mutate(entry)
				succeededIds.push(entryId)
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
				mutate: restoreLifecycleEntry,
			}),
		deleteLifecycle: (ids) =>
			runLifecycleBulkMutation({
				ids,
				mutate: deleteLifecycleEntry,
			}),
		deletePermanently: (ids) =>
			runLifecycleBulkMutation({
				ids,
				mutate: permanentlyDeleteLifecycleEntry,
			}),
	}
}
