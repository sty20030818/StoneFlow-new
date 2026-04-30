import { create } from 'zustand'

import type { ShellSectionKey } from '@/app/layouts/shell/types'

// ----- 类型 -----
type ShellNavState = {
	currentSpaceId: string | null
	currentScopeType: 'all' | 'space'
	activeSection: ShellSectionKey

	setCurrentScope: (scopeType: 'all' | 'space', spaceId?: string | null) => void
	setActiveSection: (section: ShellSectionKey) => void
}

// ----- Store -----
export const useShellNavStore = create<ShellNavState>((set) => ({
	currentSpaceId: null,
	currentScopeType: 'all',
	activeSection: 'inbox',

	setCurrentScope: (currentScopeType, currentSpaceId = null) =>
		set({ currentScopeType, currentSpaceId }),
	setActiveSection: (section) => set({ activeSection: section }),
}))

// ----- Selectors -----
export const selectCurrentSpaceId = (state: ShellNavState) => state.currentSpaceId
export const selectCurrentScopeType = (state: ShellNavState) => state.currentScopeType
export const selectActiveSection = (state: ShellNavState) => state.activeSection
