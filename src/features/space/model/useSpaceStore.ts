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
import type { Space } from '@/shared/types'

type SpaceStoreState = {
	spaces: Space[]
	status: 'idle' | 'loading' | 'ready' | 'error'
	error: string | null
	load: () => Promise<void>
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

async function reloadSpaces(set: (updater: Partial<SpaceStoreState>) => void) {
	const spaces = await listVisibleSpaces()
	set({
		spaces,
		status: 'ready',
		error: null,
	})
	return spaces
}

export const useSpaceStore = create<SpaceStoreState>((set) => ({
	spaces: [],
	status: 'idle',
	error: null,
	load: async () => {
		set({ status: 'loading', error: null })
		try {
			await reloadSpaces(set)
		} catch (error) {
			set({
				status: 'error',
				error: error instanceof Error ? error.message : 'Space 列表加载失败',
			})
		}
	},
	createSpace: async (input) => {
		const created = await createSpace(input)
		await reloadSpaces(set)
		return created
	},
	updateSpace: async (input) => {
		const updated = await updateSpace(input)
		await reloadSpaces(set)
		return updated
	},
	setDefaultSpace: async (spaceId) => {
		const updated = await setDefaultSpace(spaceId)
		await reloadSpaces(set)
		return updated
	},
	archiveSpace: async (spaceId) => {
		const updated = await archiveSpace(spaceId)
		await reloadSpaces(set)
		return updated
	},
	restoreSpace: async (spaceId) => {
		const updated = await restoreSpace(spaceId)
		await reloadSpaces(set)
		return updated
	},
	deleteSpace: async (spaceId) => {
		const updated = await deleteSpace(spaceId)
		await reloadSpaces(set)
		return updated
	},
}))

export const selectSpaces = (state: SpaceStoreState) => state.spaces
export const selectSpaceStatus = (state: SpaceStoreState) => state.status
export const selectSpaceError = (state: SpaceStoreState) => state.error
