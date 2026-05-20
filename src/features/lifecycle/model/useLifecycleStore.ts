import { create } from 'zustand'

import {
	deleteLifecycleEntry,
	listLifecycleEntries,
	permanentlyDeleteLifecycleEntry,
	restoreLifecycleEntry,
} from '@/features/lifecycle/api/lifecycle'
import { emitEvent } from '@/shared/events'
import type { LifecycleEntry, LifecycleEntityType, Scope } from '@/shared/types'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

type LifecycleSlice = {
	items: LifecycleEntry[]
	status: LoadStatus
	error: string | null
	scope: Scope | null
	entityFilter: LifecycleEntityType | undefined
}

type LifecycleStoreState = {
	archiveEntries: LifecycleSlice
	trashEntries: LifecycleSlice
	pendingEntryId: string | null
	loadArchive: (scope: Scope, entityFilter?: LifecycleEntityType) => Promise<void>
	loadTrash: (scope: Scope, entityFilter?: LifecycleEntityType) => Promise<void>
	restoreEntry: (entry: LifecycleEntry) => Promise<void>
	deleteEntry: (entry: LifecycleEntry) => Promise<void>
	permanentlyDeleteEntry: (entry: LifecycleEntry) => Promise<void>
	refreshLoadedSlices: () => Promise<void>
}

function initialSlice(): LifecycleSlice {
	return {
		items: [],
		status: 'idle',
		error: null,
		scope: null,
		entityFilter: undefined,
	}
}

async function loadSlice(
	mode: 'archive' | 'trash',
	scope: Scope,
	entityFilter: LifecycleEntityType | undefined,
) {
	return listLifecycleEntries({
		mode,
		scope,
		entityFilter,
	})
}

function emitEntityEvent(type: LifecycleEntityType, entityId: string, deleted = false) {
	if (type === 'space') {
		emitEvent({
			type: deleted ? 'space:deleted' : 'space:updated',
			payload: { spaceId: entityId },
		})
	} else if (type === 'project') {
		emitEvent({
			type: deleted ? 'project:deleted' : 'project:updated',
			payload: { projectId: entityId },
		})
	} else {
		emitEvent({
			type: deleted ? 'task:deleted' : 'task:updated',
			payload: { taskId: entityId },
		})
	}

	emitEvent({
		type: 'lifecycle:changed',
		payload: { entityType: type, entityId },
	})
}

export const useLifecycleStore = create<LifecycleStoreState>((set, get) => {
	async function refreshSlice(mode: 'archive' | 'trash') {
		const slice = mode === 'archive' ? get().archiveEntries : get().trashEntries
		if (!slice.scope) {
			return
		}

		try {
			const items = await loadSlice(mode, slice.scope, slice.entityFilter)
			set((state) => ({
				...(mode === 'archive'
					? {
							archiveEntries: {
								...state.archiveEntries,
								items,
								status: 'ready',
								error: null,
							},
						}
					: {
							trashEntries: {
								...state.trashEntries,
								items,
								status: 'ready',
								error: null,
							},
						}),
			}))
		} catch (error) {
			set((state) => ({
				...(mode === 'archive'
					? {
							archiveEntries: {
								...state.archiveEntries,
								status: state.archiveEntries.items.length > 0 ? 'ready' : 'error',
								error: error instanceof Error ? error.message : '归档列表刷新失败',
							},
						}
					: {
							trashEntries: {
								...state.trashEntries,
								status: state.trashEntries.items.length > 0 ? 'ready' : 'error',
								error: error instanceof Error ? error.message : '回收站列表刷新失败',
							},
						}),
			}))
		}
	}

	async function refreshLoadedSlices() {
		await Promise.all([refreshSlice('archive'), refreshSlice('trash')])
	}

	async function runMutation(
		entry: LifecycleEntry,
		runner: () => Promise<unknown>,
		deleted = false,
	) {
		set({ pendingEntryId: entry.id })
		try {
			await runner()
			emitEntityEvent(entry.entityType, entry.id, deleted)
			await refreshLoadedSlices()
		} finally {
			set({ pendingEntryId: null })
		}
	}

	return {
		archiveEntries: initialSlice(),
		trashEntries: initialSlice(),
		pendingEntryId: null,

		loadArchive: async (scope, entityFilter) => {
			set((state) => ({
				archiveEntries: {
					...state.archiveEntries,
					status: 'loading',
					error: null,
					scope,
					entityFilter,
				},
			}))

			try {
				const items = await loadSlice('archive', scope, entityFilter)
				set((state) => ({
					archiveEntries: {
						...state.archiveEntries,
						items,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					archiveEntries: {
						...state.archiveEntries,
						items: [],
						status: 'error',
						error: error instanceof Error ? error.message : '归档列表加载失败',
					},
				}))
			}
		},

		loadTrash: async (scope, entityFilter) => {
			set((state) => ({
				trashEntries: {
					...state.trashEntries,
					status: 'loading',
					error: null,
					scope,
					entityFilter,
				},
			}))

			try {
				const items = await loadSlice('trash', scope, entityFilter)
				set((state) => ({
					trashEntries: {
						...state.trashEntries,
						items,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					trashEntries: {
						...state.trashEntries,
						items: [],
						status: 'error',
						error: error instanceof Error ? error.message : '回收站列表加载失败',
					},
				}))
			}
		},

		restoreEntry: async (entry) => runMutation(entry, () => restoreLifecycleEntry(entry)),
		deleteEntry: async (entry) => runMutation(entry, () => deleteLifecycleEntry(entry), true),
		permanentlyDeleteEntry: async (entry) =>
			runMutation(entry, () => permanentlyDeleteLifecycleEntry(entry), true),
		refreshLoadedSlices,
	}
})

export const selectArchiveEntries = (state: LifecycleStoreState) => state.archiveEntries
export const selectTrashEntries = (state: LifecycleStoreState) => state.trashEntries
