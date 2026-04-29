import { create } from 'zustand'

import type { ShellSectionKey } from '@/app/layouts/shell/types'

// ----- 常量 -----
const CONFIGURABLE_NAV_ITEM_KEYS: ShellSectionKey[] = ['inbox', 'focus']
const SHELL_NAV_VISIBILITY_STORAGE_KEY = 'stoneflow:shell-nav-visibility:v2'

// ----- localStorage 辅助 -----
function readStoredHiddenNavItemKeys(): ShellSectionKey[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const rawValue = window.localStorage.getItem(SHELL_NAV_VISIBILITY_STORAGE_KEY)
		if (!rawValue) {
			return []
		}

		const parsedValue = JSON.parse(rawValue)
		if (!Array.isArray(parsedValue)) {
			return []
		}

		return parsedValue.filter((key): key is ShellSectionKey =>
			CONFIGURABLE_NAV_ITEM_KEYS.includes(key as ShellSectionKey),
		)
	} catch {
		return []
	}
}

function persistHiddenNavItemKeys(keys: ShellSectionKey[]) {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(SHELL_NAV_VISIBILITY_STORAGE_KEY, JSON.stringify(keys))
}

// ----- 类型 -----
type ShellNavState = {
	currentSpaceId: string
	activeSection: ShellSectionKey
	hiddenNavItemKeys: ShellSectionKey[]

	setCurrentSpaceId: (spaceId: string) => void
	setActiveSection: (section: ShellSectionKey) => void
	setNavItemVisible: (section: ShellSectionKey, visible: boolean) => void
	resetNavItemVisibility: () => void
}

// ----- Store -----
export const useShellNavStore = create<ShellNavState>((set) => ({
	currentSpaceId: 'work',
	activeSection: 'inbox',
	hiddenNavItemKeys: readStoredHiddenNavItemKeys(),

	setCurrentSpaceId: (spaceId) => set({ currentSpaceId: spaceId }),
	setActiveSection: (section) => set({ activeSection: section }),
	setNavItemVisible: (section, visible) =>
		set((state) => {
			if (!CONFIGURABLE_NAV_ITEM_KEYS.includes(section)) {
				return state
			}

			const nextHiddenKeys = visible
				? state.hiddenNavItemKeys.filter((key) => key !== section)
				: Array.from(new Set([...state.hiddenNavItemKeys, section]))
			const visibleCount = CONFIGURABLE_NAV_ITEM_KEYS.filter(
				(key) => !nextHiddenKeys.includes(key),
			).length

			// 至少保留一个可见
			if (visibleCount === 0) {
				return state
			}

			persistHiddenNavItemKeys(nextHiddenKeys)
			return { hiddenNavItemKeys: nextHiddenKeys }
		}),
	resetNavItemVisibility: () =>
		set(() => {
			persistHiddenNavItemKeys([])
			return { hiddenNavItemKeys: [] }
		}),
}))

// ----- Selectors -----
export const selectCurrentSpaceId = (state: ShellNavState) => state.currentSpaceId
export const selectActiveSection = (state: ShellNavState) => state.activeSection
export const selectHiddenNavItemKeys = (state: ShellNavState) => state.hiddenNavItemKeys
