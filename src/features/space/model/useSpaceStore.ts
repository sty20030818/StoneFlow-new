import { create } from 'zustand'

import {
	archiveSpace,
	createSpace,
	deleteSpace,
	listVisibleSpaces,
	restoreSpace,
	setDefaultSpace,
	updateSpace,
} from '@/features/space/api/spaces'
import { emitEvent } from '@/shared/events'
import type { Space } from '@/shared/types'

type SpaceStoreState = {
	spaces: Space[]
	status: 'idle' | 'loading' | 'ready' | 'error'
	error: string | null
	load: () => Promise<void>
	refresh: () => Promise<void>
	createSpace: (input: { name: string; iconKey: string; colorKey: string }) => Promise<Space>
	updateSpace: (input: {
		spaceId: string
		name?: string
		iconKey?: string
		colorKey?: string
	}) => Promise<Space>
	setDefaultSpace: (spaceId: string) => Promise<Space>
	archiveSpace: (spaceId: string) => Promise<Space>
	restoreSpace: (spaceId: string) => Promise<Space>
	deleteSpace: (spaceId: string) => Promise<Space>
}

let pendingSpaceLoad: Promise<void> | null = null

async function reloadSpaces(set: (updater: Partial<SpaceStoreState>) => void) {
	const spaces = await listVisibleSpaces()
	set({
		spaces,
		status: 'ready',
		error: null,
	})
	return spaces
}

export const useSpaceStore = create<SpaceStoreState>((set, get) => ({
	spaces: [],
	status: 'idle',
	error: null,
	load: async () => {
		const currentStatus = get().status
		if (currentStatus === 'ready') {
			return
		}

		if (pendingSpaceLoad) {
			return pendingSpaceLoad
		}

		set({ status: 'loading', error: null })

		pendingSpaceLoad = (async () => {
			try {
				const spaces = await listVisibleSpaces()
				set({
					spaces,
					status: 'ready',
					error: null,
				})
			} catch (error) {
				set({
					spaces: [],
					status: 'error',
					error: error instanceof Error ? error.message : '加载 Space 列表失败',
				})
			} finally {
				pendingSpaceLoad = null
			}
		})()

		return pendingSpaceLoad
	},
	refresh: async () => {
		try {
			await reloadSpaces(set)
		} catch (error) {
			set({
				status: 'error',
				error: error instanceof Error ? error.message : '刷新 Space 列表失败',
			})
		}
	},
	createSpace: async (input) => {
		const created = await createSpace(input)
		await reloadSpaces(set)
		emitEvent({ type: 'space:created', payload: { spaceId: created.id } })
		return created
	},
	updateSpace: async (input) => {
		const updated = await updateSpace(input)
		await reloadSpaces(set)
		emitEvent({ type: 'space:updated', payload: { spaceId: updated.id } })
		return updated
	},
	setDefaultSpace: async (spaceId) => {
		const updated = await setDefaultSpace(spaceId)
		await reloadSpaces(set)
		emitEvent({ type: 'space:updated', payload: { spaceId: updated.id } })
		return updated
	},
	archiveSpace: async (spaceId) => {
		const updated = await archiveSpace(spaceId)
		await reloadSpaces(set)
		emitEvent({ type: 'space:updated', payload: { spaceId: updated.id } })
		emitEvent({
			type: 'lifecycle:changed',
			payload: { entityType: 'space', entityId: updated.id },
		})
		return updated
	},
	restoreSpace: async (spaceId) => {
		const updated = await restoreSpace(spaceId)
		await reloadSpaces(set)
		emitEvent({ type: 'space:updated', payload: { spaceId: updated.id } })
		emitEvent({
			type: 'lifecycle:changed',
			payload: { entityType: 'space', entityId: updated.id },
		})
		return updated
	},
	deleteSpace: async (spaceId) => {
		const updated = await deleteSpace(spaceId)
		await reloadSpaces(set)
		emitEvent({ type: 'space:deleted', payload: { spaceId: updated.id } })
		emitEvent({
			type: 'lifecycle:changed',
			payload: { entityType: 'space', entityId: updated.id },
		})
		return updated
	},
}))

export const selectSpaces = (state: SpaceStoreState) => state.spaces
export const selectSpaceStatus = (state: SpaceStoreState) => state.status
export const selectSpaceError = (state: SpaceStoreState) => state.error
