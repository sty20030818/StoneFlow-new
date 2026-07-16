import { create } from 'zustand'

import type { CommandSelectionContext } from '@/features/command/core'
import type { PageFilterKind } from '@/features/filter'
import type { CustomDateFieldKey } from '@/features/metadata-fields/core'
import type { CommandMenuMode } from '@/features/command/components/command-menu-types'
import type { TaskPlacement, TaskStatus } from '@/shared/types'

// ----- 类型 -----
type TaskCreateDialogDraft = {
	projectId?: string | null
	status?: TaskStatus
	placement?: TaskPlacement
}

export type CreateDialogPresentation = 'default' | 'fullscreen'

type CreateDialogType = 'task' | 'project' | null

export type CustomDateDialogState = {
	fieldKey: CustomDateFieldKey
	label: string
	value: string | null
	hasExistingValue: boolean
	onSubmit: ((value: string | null) => void) | null
}

type DialogState = {
	isCommandOpen: boolean
	commandMenuMode: CommandMenuMode
	commandSelectionOverride: CommandSelectionContext | null
	commandMenuFilterKind: PageFilterKind
	isShortcutHelpOpen: boolean
	createDialogType: CreateDialogType
	taskCreateDraft: TaskCreateDialogDraft
	taskCreatePresentation: CreateDialogPresentation
	customDateDialog: CustomDateDialogState | null

	openCommand: (
		mode?: CommandMenuMode,
		selectionOverride?: CommandSelectionContext | null,
		filterKind?: PageFilterKind,
	) => void
	closeCommand: () => void
	setCommandOpen: (open: boolean) => void
	setCommandMenuFilterKind: (kind: PageFilterKind) => void
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
	openCustomDateDialog: (state: CustomDateDialogState) => void
	closeCustomDateDialog: () => void
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
	commandMenuFilterKind: 'root',
	isShortcutHelpOpen: false,
	createDialogType: null,
	taskCreateDraft: { ...defaultTaskDraft },
	taskCreatePresentation: 'default',
	customDateDialog: null,

	openCommand: (mode = 'default', selectionOverride = null, filterKind = 'root') => {
		set({
			isCommandOpen: true,
			commandMenuMode: mode,
			commandSelectionOverride: selectionOverride,
			commandMenuFilterKind: filterKind,
			isShortcutHelpOpen: false,
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
			customDateDialog: null,
		})
	},
	closeCommand: () =>
		set({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			commandMenuFilterKind: 'root',
		}),
	setCommandOpen: (open) => {
		set({
			isCommandOpen: open,
			commandMenuMode: open ? useDialogStore.getState().commandMenuMode : 'default',
			commandSelectionOverride: open ? useDialogStore.getState().commandSelectionOverride : null,
			commandMenuFilterKind: open ? useDialogStore.getState().commandMenuFilterKind : 'root',
			isShortcutHelpOpen: open ? false : useDialogStore.getState().isShortcutHelpOpen,
		})
	},
	setCommandMenuFilterKind: (kind) => set({ commandMenuFilterKind: kind }),
	openShortcutHelp: () => {
		set({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			commandMenuFilterKind: 'root',
			isShortcutHelpOpen: true,
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
			customDateDialog: null,
		})
	},
	closeShortcutHelp: () => set({ isShortcutHelpOpen: false }),
	toggleShortcutHelp: () =>
		set((state) => ({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			commandMenuFilterKind: 'root',
			isShortcutHelpOpen: !state.isShortcutHelpOpen,
		})),
	setShortcutHelpOpen: (open) => {
		set({
			isCommandOpen: open ? false : useDialogStore.getState().isCommandOpen,
			commandMenuMode: open ? 'default' : useDialogStore.getState().commandMenuMode,
			commandSelectionOverride: open ? null : useDialogStore.getState().commandSelectionOverride,
			commandMenuFilterKind: open ? 'root' : useDialogStore.getState().commandMenuFilterKind,
			isShortcutHelpOpen: open,
		})
	},

	openTaskCreateDialog: (draft, presentation = 'default') => {
		set({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			commandMenuFilterKind: 'root',
			isShortcutHelpOpen: false,
			createDialogType: 'task',
			taskCreateDraft: {
				projectId: draft?.projectId ?? null,
				status: draft?.status ?? 'todo',
				placement: draft?.placement ?? undefined,
			},
			taskCreatePresentation: presentation,
			customDateDialog: null,
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
		set({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			commandMenuFilterKind: 'root',
			isShortcutHelpOpen: false,
			createDialogType: 'project',
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
			customDateDialog: null,
		})
	},
	closeProjectCreateDialog: () =>
		set({
			createDialogType: null,
			taskCreatePresentation: 'default',
		}),
	openCustomDateDialog: (customDateDialog) => {
		set({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
			commandMenuFilterKind: 'root',
			isShortcutHelpOpen: false,
			createDialogType: null,
			taskCreateDraft: { ...defaultTaskDraft },
			taskCreatePresentation: 'default',
			customDateDialog,
		})
	},
	closeCustomDateDialog: () =>
		set({
			customDateDialog: null,
		}),
}))

// ----- Selectors -----
export const selectIsCommandOpen = (state: DialogState) => state.isCommandOpen
export const selectCommandMenuMode = (state: DialogState) => state.commandMenuMode
export const selectCommandSelectionOverride = (state: DialogState) => state.commandSelectionOverride
export const selectCommandMenuFilterKind = (state: DialogState) => state.commandMenuFilterKind
export const selectIsShortcutHelpOpen = (state: DialogState) => state.isShortcutHelpOpen
export const selectCreateDialogType = (state: DialogState) => state.createDialogType
export const selectTaskCreateDraft = (state: DialogState) => state.taskCreateDraft
export const selectTaskCreatePresentation = (state: DialogState) => state.taskCreatePresentation
export const selectCustomDateDialog = (state: DialogState) => state.customDateDialog

// 向后兼容 selectors（供未迁移的调用方使用）
export const selectIsTaskCreateOpen = (state: DialogState) => state.createDialogType === 'task'
export const selectIsProjectCreateOpen = (state: DialogState) =>
	state.createDialogType === 'project'
export const selectTaskCreateProjectId = (state: DialogState) =>
	state.taskCreateDraft.projectId ?? null
export const selectTaskCreateStatus = (state: DialogState) => state.taskCreateDraft.status ?? 'todo'
export const selectTaskCreateInitialPlacement = (state: DialogState) =>
	state.taskCreateDraft.placement ?? null
