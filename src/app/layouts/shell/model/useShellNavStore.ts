import { create } from 'zustand'

import type { ShellSectionKey } from '@/app/layouts/shell/types'

// ----- 类型 -----
type ShellNavState = {
	currentSpaceId: string
	activeSection: ShellSectionKey

	setCurrentSpaceId: (spaceId: string) => void
	setActiveSection: (section: ShellSectionKey) => void
}

// ----- Store -----
export const useShellNavStore = create<ShellNavState>((set) => ({
	currentSpaceId: 'work',
	activeSection: 'inbox',

	setCurrentSpaceId: (spaceId) => set({ currentSpaceId: spaceId }),
	setActiveSection: (section) => set({ activeSection: section }),
}))

// ----- Selectors -----
export const selectCurrentSpaceId = (state: ShellNavState) => state.currentSpaceId
export const selectActiveSection = (state: ShellNavState) => state.activeSection
