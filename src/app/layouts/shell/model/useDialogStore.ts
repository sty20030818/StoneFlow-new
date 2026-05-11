import { create } from 'zustand'

import type { TaskPlacement, TaskStatus } from '@/shared/types'

import { useDrawerStore } from './useDrawerStore'

// ----- 类型 -----
type TaskCreateDialogDraft = {
	projectId?: string | null
	status?: TaskStatus
	placement?: TaskPlacement
}

export type CreateDialogPresentation = 'default' | 'fullscreen'

type CreateDialogType = 'task' | 'project' | null

type DialogState = {
	isCommandOpen: boolean
	createDialogType: CreateDialogType
	taskCreateDraft: TaskCreateDialogDraft
	taskCreatePresentation: CreateDialogPresentation

	openCommand: () => void
	closeCommand: () => void
	setCommandOpen: (open: boolean) => void
	openTaskCreateDialog: (
		draft?: TaskCreateDialogDraft,
		presentation?: CreateDialogPresentation,
	) => void
	closeTaskCreateDialog: () => void
	toggleTaskCreatePresentation: () => void
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
	taskCreatePresentation: 'default',

	openCommand: () => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: true,
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
		})
	},
	closeCommand: () => set({ isCommandOpen: false }),
	setCommandOpen: (open) => {
		if (open) {
			useDrawerStore.getState().closeDrawer()
		}
		set({ isCommandOpen: open })
	},

	openTaskCreateDialog: (draft, presentation = 'default') => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			createDialogType: 'task',
			taskCreateDraft: {
				projectId: draft?.projectId ?? null,
				status: draft?.status ?? 'todo',
				placement: draft?.placement ?? undefined,
			},
			taskCreatePresentation: presentation,
		})
	},
	closeTaskCreateDialog: () =>
		set({
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
		}),
	toggleTaskCreatePresentation: () =>
		set((state) => ({
			taskCreatePresentation:
				state.taskCreatePresentation === 'fullscreen' ? 'default' : 'fullscreen',
		})),

	openProjectCreateDialog: () => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			createDialogType: 'project',
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
		})
	},
	closeProjectCreateDialog: () =>
		set({
			createDialogType: null,
			taskCreatePresentation: 'default',
		}),
}))

// ----- Selectors -----
export const selectIsCommandOpen = (state: DialogState) => state.isCommandOpen
export const selectCreateDialogType = (state: DialogState) => state.createDialogType
export const selectTaskCreateDraft = (state: DialogState) => state.taskCreateDraft
export const selectTaskCreatePresentation = (state: DialogState) => state.taskCreatePresentation

// 向后兼容 selectors（供未迁移的调用方使用）
export const selectIsTaskCreateOpen = (state: DialogState) => state.createDialogType === 'task'
export const selectIsProjectCreateOpen = (state: DialogState) => state.createDialogType === 'project'
export const selectTaskCreateProjectId = (state: DialogState) => state.taskCreateDraft.projectId ?? null
export const selectTaskCreateStatus = (state: DialogState) => state.taskCreateDraft.status ?? 'todo'
export const selectTaskCreateInitialPlacement = (state: DialogState) =>
	state.taskCreateDraft.placement ?? null
