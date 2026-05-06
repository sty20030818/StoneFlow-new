import { create } from 'zustand'

import type { TaskPlacement, TaskStatus } from '@/shared/types'

import { useDrawerStore } from './useDrawerStore'

// ----- 类型 -----
type TaskCreateDialogDraft = {
	projectId?: string | null
	status?: TaskStatus
	placement?: TaskPlacement
}

type CreateDialogType = 'task' | 'project' | null

type DialogState = {
	isCommandOpen: boolean
	createDialogType: CreateDialogType
	taskCreateDraft: TaskCreateDialogDraft

	openCommand: () => void
	closeCommand: () => void
	setCommandOpen: (open: boolean) => void
	openTaskCreateDialog: (draft?: TaskCreateDialogDraft) => void
	closeTaskCreateDialog: () => void
	openProjectCreateDialog: () => void
	closeProjectCreateDialog: () => void
}

const defaultTaskDraft: TaskCreateDialogDraft = {
	projectId: null,
	status: 'todo',
	placement: undefined,
}

// ----- Store -----
export const useDialogStore = create<DialogState>((set) => ({
	isCommandOpen: false,
	createDialogType: null,
	taskCreateDraft: { ...defaultTaskDraft },

	openCommand: () => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: true,
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
		})
	},
	closeCommand: () => set({ isCommandOpen: false }),
	setCommandOpen: (open) => {
		if (open) {
			useDrawerStore.getState().closeDrawer()
		}
		set({ isCommandOpen: open })
	},

	openTaskCreateDialog: (draft) => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			createDialogType: 'task',
			taskCreateDraft: {
				projectId: draft?.projectId ?? null,
				status: draft?.status ?? 'todo',
				placement: draft?.placement ?? undefined,
			},
		})
	},
	closeTaskCreateDialog: () =>
		set({
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
		}),

	openProjectCreateDialog: () => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			createDialogType: 'project',
			taskCreateDraft: { ...defaultTaskDraft },
		})
	},
	closeProjectCreateDialog: () =>
		set({
			createDialogType: null,
		}),
}))

// ----- Selectors -----
export const selectIsCommandOpen = (state: DialogState) => state.isCommandOpen
export const selectCreateDialogType = (state: DialogState) => state.createDialogType
export const selectTaskCreateDraft = (state: DialogState) => state.taskCreateDraft

// 向后兼容 selectors（供未迁移的调用方使用）
export const selectIsTaskCreateOpen = (state: DialogState) => state.createDialogType === 'task'
export const selectIsProjectCreateOpen = (state: DialogState) => state.createDialogType === 'project'
export const selectTaskCreateProjectId = (state: DialogState) => state.taskCreateDraft.projectId ?? null
export const selectTaskCreateStatus = (state: DialogState) => state.taskCreateDraft.status ?? 'todo'
export const selectTaskCreateInitialPlacement = (state: DialogState) =>
	state.taskCreateDraft.placement ?? null
