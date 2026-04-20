import { create } from 'zustand'

import type { ShellDrawerKind, ShellSectionKey } from '@/app/layouts/shell/types'

type ShellLayoutState = {
	currentSpaceId: string
	activeSection: ShellSectionKey
	isCommandOpen: boolean
	isTaskCreateOpen: boolean
	isProjectCreateOpen: boolean
	isDrawerOpen: boolean
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
	taskDataVersion: number
	projectDataVersion: number
	setCurrentSpaceId: (spaceId: string) => void
	setActiveSection: (section: ShellSectionKey) => void
	setCommandOpen: (open: boolean) => void
	openCommand: () => void
	closeCommand: () => void
	openTaskCreateDialog: () => void
	closeTaskCreateDialog: () => void
	openProjectCreateDialog: () => void
	closeProjectCreateDialog: () => void
	setDrawerOpen: (open: boolean) => void
	openDrawer: (kind: ShellDrawerKind, id: string) => void
	closeDrawer: () => void
	bumpTaskDataVersion: () => void
	bumpProjectDataVersion: () => void
}

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
	currentSpaceId: 'default',
	activeSection: 'inbox',
	isCommandOpen: false,
	isTaskCreateOpen: false,
	isProjectCreateOpen: false,
	isDrawerOpen: false,
	activeDrawerKind: null,
	activeDrawerId: null,
	taskDataVersion: 0,
	projectDataVersion: 0,
	setCurrentSpaceId: (spaceId) => set({ currentSpaceId: spaceId }),
	setActiveSection: (section) => set({ activeSection: section }),
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
	openProjectCreateDialog: () =>
		set({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: true,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
	closeProjectCreateDialog: () =>
		set({
			isProjectCreateOpen: false,
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
}))

export const selectCurrentSpaceId = (state: ShellLayoutState) => state.currentSpaceId

export const selectActiveSection = (state: ShellLayoutState) => state.activeSection

export const selectIsCommandOpen = (state: ShellLayoutState) => state.isCommandOpen

export const selectIsTaskCreateOpen = (state: ShellLayoutState) => state.isTaskCreateOpen

export const selectIsProjectCreateOpen = (state: ShellLayoutState) => state.isProjectCreateOpen

export const selectIsDrawerOpen = (state: ShellLayoutState) => state.isDrawerOpen

export const selectActiveDrawerKind = (state: ShellLayoutState) => state.activeDrawerKind

export const selectActiveDrawerId = (state: ShellLayoutState) => state.activeDrawerId

export const selectTaskDataVersion = (state: ShellLayoutState) => state.taskDataVersion

export const selectProjectDataVersion = (state: ShellLayoutState) => state.projectDataVersion
