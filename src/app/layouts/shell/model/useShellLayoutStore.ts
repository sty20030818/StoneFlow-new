import { create } from 'zustand'

import type { ShellDrawerKind, ShellSectionKey } from '@/app/layouts/shell/types'

type ShellLayoutState = {
	currentSpaceId: string
	activeSection: ShellSectionKey
	isCommandOpen: boolean
	isDrawerOpen: boolean
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
	setCurrentSpaceId: (spaceId: string) => void
	setActiveSection: (section: ShellSectionKey) => void
	setCommandOpen: (open: boolean) => void
	openCommand: () => void
	closeCommand: () => void
	setDrawerOpen: (open: boolean) => void
	openDrawer: (kind: ShellDrawerKind, id: string) => void
	closeDrawer: () => void
}

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
	currentSpaceId: 'default',
	activeSection: 'inbox',
	isCommandOpen: false,
	isDrawerOpen: false,
	activeDrawerKind: null,
	activeDrawerId: null,
	setCurrentSpaceId: (spaceId) => set({ currentSpaceId: spaceId }),
	setActiveSection: (section) => set({ activeSection: section }),
	setCommandOpen: (open) => set({ isCommandOpen: open }),
	openCommand: () => set({ isCommandOpen: true }),
	closeCommand: () => set({ isCommandOpen: false }),
	setDrawerOpen: (open) =>
		set(() =>
			open
				? { isDrawerOpen: true }
				: {
						isDrawerOpen: false,
						activeDrawerKind: null,
						activeDrawerId: null,
					},
		),
	openDrawer: (kind, id) =>
		set({
			isDrawerOpen: true,
			activeDrawerKind: kind,
			activeDrawerId: id,
		}),
	closeDrawer: () =>
		set({
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
}))

export const selectCurrentSpaceId = (state: ShellLayoutState) => state.currentSpaceId

export const selectActiveSection = (state: ShellLayoutState) => state.activeSection

export const selectIsCommandOpen = (state: ShellLayoutState) => state.isCommandOpen

export const selectIsDrawerOpen = (state: ShellLayoutState) => state.isDrawerOpen

export const selectActiveDrawerKind = (state: ShellLayoutState) => state.activeDrawerKind

export const selectActiveDrawerId = (state: ShellLayoutState) => state.activeDrawerId
