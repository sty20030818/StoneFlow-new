import { create } from 'zustand'

import type { CommandSelectionContext } from '@/features/command/core'
import type { CommandMenuMode } from '@/features/command/ui/command-menu-types'
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
	commandMenuMode: CommandMenuMode
	commandSelectionOverride: CommandSelectionContext | null
	isShortcutHelpOpen: boolean
	createDialogType: CreateDialogType
	taskCreateDraft: TaskCreateDialogDraft
	taskCreatePresentation: CreateDialogPresentation

	openCommand: (mode?: CommandMenuMode, selectionOverride?: CommandSelectionContext | null) => void
	closeCommand: () => void
	setCommandOpen: (open: boolean) => void
	openShortcutHelp: () => void
	closeShortcutHelp: () => void
	toggleShortcutHelp: () => void
	setShortcutHelpOpen: (open: boolean) => void
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
	commandMenuMode: 'default',
	commandSelectionOverride: null,
	isShortcutHelpOpen: false,
	createDialogType: null,
	taskCreateDraft: { ...defaultTaskDraft },
	taskCreatePresentation: 'default',

	openCommand: (mode = 'default', selectionOverride = null) => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: true,
			commandMenuMode: mode,
			commandSelectionOverride: selectionOverride,
			isShortcutHelpOpen: false,
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
		})
	},
	closeCommand: () =>
		set({ isCommandOpen: false, commandMenuMode: 'default', commandSelectionOverride: null }),
	setCommandOpen: (open) => {
		if (open) {
			useDrawerStore.getState().closeDrawer()
		}
		set({
			isCommandOpen: open,
			commandMenuMode: open ? useDialogStore.getState().commandMenuMode : 'default',
			commandSelectionOverride: open ? useDialogStore.getState().commandSelectionOverride : null,
			isShortcutHelpOpen: open ? false : useDialogStore.getState().isShortcutHelpOpen,
		})
	},
	openShortcutHelp: () => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			isShortcutHelpOpen: true,
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
		})
	},
	closeShortcutHelp: () => set({ isShortcutHelpOpen: false }),
	toggleShortcutHelp: () =>
		set((state) => ({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			isShortcutHelpOpen: !state.isShortcutHelpOpen,
		})),
	setShortcutHelpOpen: (open) => {
		if (open) {
			useDrawerStore.getState().closeDrawer()
		}
		set({
			isCommandOpen: open ? false : useDialogStore.getState().isCommandOpen,
			commandMenuMode: open ? 'default' : useDialogStore.getState().commandMenuMode,
			commandSelectionOverride: open ? null : useDialogStore.getState().commandSelectionOverride,
			isShortcutHelpOpen: open,
		})
	},

	openTaskCreateDialog: (draft, presentation = 'default') => {
		useDrawerStore.getState().closeDrawer()
		set({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			isShortcutHelpOpen: false,
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
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			isShortcutHelpOpen: false,
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
export const selectCommandMenuMode = (state: DialogState) => state.commandMenuMode
export const selectCommandSelectionOverride = (state: DialogState) =>
	state.commandSelectionOverride
export const selectIsShortcutHelpOpen = (state: DialogState) => state.isShortcutHelpOpen
export const selectCreateDialogType = (state: DialogState) => state.createDialogType
export const selectTaskCreateDraft = (state: DialogState) => state.taskCreateDraft
export const selectTaskCreatePresentation = (state: DialogState) => state.taskCreatePresentation

// 向后兼容 selectors（供未迁移的调用方使用）
export const selectIsTaskCreateOpen = (state: DialogState) => state.createDialogType === 'task'
export const selectIsProjectCreateOpen = (state: DialogState) =>
	state.createDialogType === 'project'
export const selectTaskCreateProjectId = (state: DialogState) =>
	state.taskCreateDraft.projectId ?? null
export const selectTaskCreateStatus = (state: DialogState) => state.taskCreateDraft.status ?? 'todo'
export const selectTaskCreateInitialPlacement = (state: DialogState) =>
	state.taskCreateDraft.placement ?? null
