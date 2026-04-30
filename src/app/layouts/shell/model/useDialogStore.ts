import { create } from 'zustand'

import type { TaskStatus } from '@/shared/types'

import { useDrawerStore } from './useDrawerStore'

// ----- 类型 -----
type TaskCreateDialogDraft = {
	projectId?: string | null
	status?: TaskStatus
}

type DialogState = {
	isCommandOpen: boolean
	isTaskCreateOpen: boolean
	taskCreateProjectId: string | null
	taskCreateStatus: TaskStatus
	isProjectCreateOpen: boolean

	openCommand: () => void
	closeCommand: () => void
	setCommandOpen: (open: boolean) => void
	openTaskCreateDialog: (draft?: TaskCreateDialogDraft) => void
	closeTaskCreateDialog: () => void
	openProjectCreateDialog: () => void
	closeProjectCreateDialog: () => void
}

// ----- Store -----
export const useDialogStore = create<DialogState>((set) => ({
	isCommandOpen: false,
	isTaskCreateOpen: false,
	taskCreateProjectId: null,
	taskCreateStatus: 'todo',
	isProjectCreateOpen: false,

	openCommand: () => {
		// 互斥：关闭 drawer
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: true,
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
			isProjectCreateOpen: false,
		})
	},
	closeCommand: () => set({ isCommandOpen: false }),
	setCommandOpen: (open) => {
		if (open) {
			// 互斥：关闭 drawer
			useDrawerStore.getState().closeDrawer()
		}
		set({ isCommandOpen: open })
	},

	openTaskCreateDialog: (draft) => {
		// 互斥：关闭 drawer
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			isTaskCreateOpen: true,
			taskCreateProjectId: draft?.projectId ?? null,
			taskCreateStatus: draft?.status ?? 'todo',
			isProjectCreateOpen: false,
		})
	},
	closeTaskCreateDialog: () =>
		set({
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
		}),

	openProjectCreateDialog: () => {
		// 互斥：关闭 drawer
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
			isProjectCreateOpen: true,
		})
	},
	closeProjectCreateDialog: () =>
		set({
			isProjectCreateOpen: false,
		}),
}))

// ----- Selectors -----
export const selectIsCommandOpen = (state: DialogState) => state.isCommandOpen
export const selectIsTaskCreateOpen = (state: DialogState) => state.isTaskCreateOpen
export const selectTaskCreateProjectId = (state: DialogState) => state.taskCreateProjectId
export const selectTaskCreateStatus = (state: DialogState) => state.taskCreateStatus
export const selectIsProjectCreateOpen = (state: DialogState) => state.isProjectCreateOpen
