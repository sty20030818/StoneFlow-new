import { create } from 'zustand'

import type { ShellDrawerKind, ShellSectionKey } from '@/app/layouts/shell/types'
import type { ShellTaskStatus } from '@/features/workspace-shell/model/shellData'

type TaskCreateDialogDraft = {
	projectId?: string | null
	status?: ShellTaskStatus
}

type ShellLayoutState = {
	currentSpaceId: string
	activeSection: ShellSectionKey
	hiddenNavItemKeys: ShellSectionKey[]
	isCommandOpen: boolean
	isTaskCreateOpen: boolean
	taskCreateProjectId: string | null
	taskCreateStatus: ShellTaskStatus
	isProjectCreateOpen: boolean
	projectCreateParentId: string | null
	isDrawerOpen: boolean
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
	projectTreeCollapsed: Record<string, boolean>
	projectTaskBoardOpenSections: ShellTaskStatus[]
	setCurrentSpaceId: (spaceId: string) => void
	setActiveSection: (section: ShellSectionKey) => void
	setNavItemVisible: (section: ShellSectionKey, visible: boolean) => void
	resetNavItemVisibility: () => void
	setCommandOpen: (open: boolean) => void
	openCommand: () => void
	closeCommand: () => void
	openTaskCreateDialog: (draft?: TaskCreateDialogDraft) => void
	closeTaskCreateDialog: () => void
	openProjectCreateDialog: (parentProjectId?: string | null) => void
	closeProjectCreateDialog: () => void
	setDrawerOpen: (open: boolean) => void
	openDrawer: (kind: ShellDrawerKind, id: string) => void
	closeDrawer: () => void
	setProjectTreeCollapsed: (payload: {
		spaceId: string
		projectId: string
		collapsed: boolean
	}) => void
	setProjectTaskBoardOpenSections: (sections: ShellTaskStatus[]) => void
}

const SHELL_NAV_VISIBILITY_STORAGE_KEY = 'stoneflow:shell-nav-visibility:v2'
const PROJECT_TASK_BOARD_OPEN_SECTIONS_STORAGE_KEY = 'stoneflow:project-task-board-open-sections:v2'
const CONFIGURABLE_NAV_ITEM_KEYS: ShellSectionKey[] = ['inbox', 'focus']
const DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS: ShellTaskStatus[] = ['todo', 'done']

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

function readStoredProjectTaskBoardOpenSections() {
	if (typeof window === 'undefined') {
		return DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS
	}

	try {
		const rawValue = window.localStorage.getItem(PROJECT_TASK_BOARD_OPEN_SECTIONS_STORAGE_KEY)
		if (!rawValue) {
			return DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS
		}

		const parsedValue = JSON.parse(rawValue)
		if (!Array.isArray(parsedValue)) {
			return DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS
		}

		const normalizedValue = parsedValue.filter(
			(section): section is ShellTaskStatus => section === 'todo' || section === 'done',
		)

		return normalizedValue.length > 0
			? Array.from(new Set(normalizedValue))
			: DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS
	} catch {
		return DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS
	}
}

function persistProjectTaskBoardOpenSections(sections: ShellTaskStatus[]) {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(
		PROJECT_TASK_BOARD_OPEN_SECTIONS_STORAGE_KEY,
		JSON.stringify(sections),
	)
}

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
	currentSpaceId: 'work',
	activeSection: 'inbox',
	hiddenNavItemKeys: readStoredHiddenNavItemKeys(),
	isCommandOpen: false,
	isTaskCreateOpen: false,
	taskCreateProjectId: null,
	taskCreateStatus: 'todo',
	isProjectCreateOpen: false,
	projectCreateParentId: null,
	isDrawerOpen: false,
	activeDrawerKind: null,
	activeDrawerId: null,
	projectTreeCollapsed: {},
	projectTaskBoardOpenSections: readStoredProjectTaskBoardOpenSections(),
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
		set({
			isCommandOpen: open,
			isDrawerOpen: open ? false : false,
			activeDrawerKind: open ? null : null,
			activeDrawerId: open ? null : null,
		}),
	openCommand: () =>
		set({
			isCommandOpen: true,
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
			isProjectCreateOpen: false,
			projectCreateParentId: null,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
	closeCommand: () => set({ isCommandOpen: false }),
	openTaskCreateDialog: (draft) =>
		set({
			isCommandOpen: false,
			isTaskCreateOpen: true,
			taskCreateProjectId: draft?.projectId ?? null,
			taskCreateStatus: draft?.status ?? 'todo',
			isProjectCreateOpen: false,
			projectCreateParentId: null,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
	closeTaskCreateDialog: () =>
		set({
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
		}),
	openProjectCreateDialog: (parentProjectId = null) =>
		set({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
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
		set({
			isDrawerOpen: open,
			activeDrawerKind: open ? null : null,
			activeDrawerId: open ? null : null,
		}),
	openDrawer: (kind, id) =>
		set({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
			isProjectCreateOpen: false,
			projectCreateParentId: null,
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
	setProjectTreeCollapsed: ({ spaceId, projectId, collapsed }) =>
		set((state) => ({
			projectTreeCollapsed: {
				...state.projectTreeCollapsed,
				[toProjectTreeKey(spaceId, projectId)]: collapsed,
			},
		})),
	setProjectTaskBoardOpenSections: (sections) =>
		set(() => {
			const normalizedSections = sections.length
				? Array.from(new Set(sections.filter((section) => section === 'todo' || section === 'done')))
				: DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS
			persistProjectTaskBoardOpenSections(normalizedSections)
			return {
				projectTaskBoardOpenSections: normalizedSections,
			}
		}),
}))

export const selectCurrentSpaceId = (state: ShellLayoutState) => state.currentSpaceId
export const selectActiveSection = (state: ShellLayoutState) => state.activeSection
export const selectHiddenNavItemKeys = (state: ShellLayoutState) => state.hiddenNavItemKeys
export const selectIsCommandOpen = (state: ShellLayoutState) => state.isCommandOpen
export const selectIsDrawerOpen = (state: ShellLayoutState) => state.isDrawerOpen
export const selectIsTaskCreateOpen = (state: ShellLayoutState) => state.isTaskCreateOpen
export const selectTaskCreateProjectId = (state: ShellLayoutState) => state.taskCreateProjectId
export const selectTaskCreateStatus = (state: ShellLayoutState) => state.taskCreateStatus
export const selectIsProjectCreateOpen = (state: ShellLayoutState) => state.isProjectCreateOpen
export const selectProjectCreateParentId = (state: ShellLayoutState) => state.projectCreateParentId
export const selectActiveDrawerKind = (state: ShellLayoutState) => state.activeDrawerKind
export const selectActiveDrawerId = (state: ShellLayoutState) => state.activeDrawerId
export const selectProjectTreeCollapsed = (state: ShellLayoutState) => state.projectTreeCollapsed
export const selectProjectTaskBoardOpenSections = (state: ShellLayoutState) =>
	state.projectTaskBoardOpenSections

export function toProjectTreeKey(spaceId: string, projectId: string) {
	return `${spaceId}::${projectId}`
}
