import { create } from 'zustand'

import type { ShellDrawerKind, ShellSectionKey } from '@/app/layouts/shell/types'

type ShellLayoutState = {
	currentSpaceId: string
	activeSection: ShellSectionKey
	hiddenNavItemKeys: ShellSectionKey[]
	isCommandOpen: boolean
	isTaskCreateOpen: boolean
	isProjectCreateOpen: boolean
	projectCreateParentId: string | null
	isDrawerOpen: boolean
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
	taskDataVersion: number
	projectDataVersion: number
	projectTreeCollapsed: Record<string, boolean>
	setCurrentSpaceId: (spaceId: string) => void
	setActiveSection: (section: ShellSectionKey) => void
	setNavItemVisible: (section: ShellSectionKey, visible: boolean) => void
	resetNavItemVisibility: () => void
	setCommandOpen: (open: boolean) => void
	openCommand: () => void
	closeCommand: () => void
	openTaskCreateDialog: () => void
	closeTaskCreateDialog: () => void
	openProjectCreateDialog: (parentProjectId?: string | null) => void
	closeProjectCreateDialog: () => void
	setDrawerOpen: (open: boolean) => void
	openDrawer: (kind: ShellDrawerKind, id: string) => void
	closeDrawer: () => void
	bumpTaskDataVersion: () => void
	bumpProjectDataVersion: () => void
	setProjectTreeCollapsed: (payload: { spaceId: string; projectId: string; collapsed: boolean }) => void
}

const SHELL_NAV_VISIBILITY_STORAGE_KEY = 'stoneflow:shell-nav-visibility:v1'
const CONFIGURABLE_NAV_ITEM_KEYS: ShellSectionKey[] = ['inbox', 'focus']

function readStoredHiddenNavItemKeys() {
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

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
	currentSpaceId: 'work',
	activeSection: 'inbox',
	hiddenNavItemKeys: readStoredHiddenNavItemKeys(),
	isCommandOpen: false,
	isTaskCreateOpen: false,
	isProjectCreateOpen: false,
	projectCreateParentId: null,
	isDrawerOpen: false,
	activeDrawerKind: null,
	activeDrawerId: null,
	taskDataVersion: 0,
	projectDataVersion: 0,
	projectTreeCollapsed: {},
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

			// 至少保留一个固定导航入口，避免侧栏被用户偏好清空后失去恢复路径。
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
	setCommandOpen: (open) =>
		set(() =>
			open
				? {
						isCommandOpen: true,
						isTaskCreateOpen: false,
						isProjectCreateOpen: false,
						isDrawerOpen: false,
						activeDrawerKind: null,
						activeDrawerId: null,
					}
				: {
						isCommandOpen: false,
					},
		),
	openCommand: () =>
		set({
			isCommandOpen: true,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
	closeCommand: () => set({ isCommandOpen: false }),
	openTaskCreateDialog: () =>
		set({
			isCommandOpen: false,
			isTaskCreateOpen: true,
			isProjectCreateOpen: false,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
	closeTaskCreateDialog: () =>
		set({
			isTaskCreateOpen: false,
		}),
	openProjectCreateDialog: (parentProjectId = null) =>
		set({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: true,
			projectCreateParentId: parentProjectId,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
	closeProjectCreateDialog: () =>
		set({
			isProjectCreateOpen: false,
			projectCreateParentId: null,
		}),
	setDrawerOpen: (open) =>
		set(() =>
			open
				? {
						isCommandOpen: false,
						isTaskCreateOpen: false,
						isProjectCreateOpen: false,
						isDrawerOpen: true,
					}
				: {
						isDrawerOpen: false,
						activeDrawerKind: null,
						activeDrawerId: null,
					},
		),
	openDrawer: (kind, id) =>
		set({
			isDrawerOpen: true,
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			activeDrawerKind: kind,
			activeDrawerId: id,
		}),
	closeDrawer: () =>
		set({
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
	bumpTaskDataVersion: () =>
		set((state) => ({
			taskDataVersion: state.taskDataVersion + 1,
		})),
	bumpProjectDataVersion: () =>
		set((state) => ({
			projectDataVersion: state.projectDataVersion + 1,
		})),
	setProjectTreeCollapsed: ({ spaceId, projectId, collapsed }) =>
		set((state) => {
			const key = toProjectTreeKey(spaceId, projectId)
			return {
				projectTreeCollapsed: {
					...state.projectTreeCollapsed,
					[key]: collapsed,
				},
			}
		}),
}))

export const selectCurrentSpaceId = (state: ShellLayoutState) => state.currentSpaceId

export const selectActiveSection = (state: ShellLayoutState) => state.activeSection

export const selectHiddenNavItemKeys = (state: ShellLayoutState) => state.hiddenNavItemKeys

export const selectIsCommandOpen = (state: ShellLayoutState) => state.isCommandOpen

export const selectIsTaskCreateOpen = (state: ShellLayoutState) => state.isTaskCreateOpen

export const selectIsProjectCreateOpen = (state: ShellLayoutState) => state.isProjectCreateOpen

export const selectProjectCreateParentId = (state: ShellLayoutState) => state.projectCreateParentId

export const selectIsDrawerOpen = (state: ShellLayoutState) => state.isDrawerOpen

export const selectActiveDrawerKind = (state: ShellLayoutState) => state.activeDrawerKind

export const selectActiveDrawerId = (state: ShellLayoutState) => state.activeDrawerId

export const selectTaskDataVersion = (state: ShellLayoutState) => state.taskDataVersion

export const selectProjectDataVersion = (state: ShellLayoutState) => state.projectDataVersion

export const selectProjectTreeCollapsed = (state: ShellLayoutState) => state.projectTreeCollapsed

export function toProjectTreeKey(spaceId: string, projectId: string) {
	return `${spaceId}:${projectId}`
}
