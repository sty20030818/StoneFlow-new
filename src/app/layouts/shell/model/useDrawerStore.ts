import { create } from 'zustand'

import type { ShellDrawerKind } from '@/app/layouts/shell/types'

import { useDialogStore } from './useDialogStore'

// ----- 类型 -----
type DrawerState = {
	isDrawerOpen: boolean
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null

	openDrawer: (kind: ShellDrawerKind, id: string) => void
	closeDrawer: () => void
}

// ----- Store -----
export const useDrawerStore = create<DrawerState>((set) => ({
	isDrawerOpen: false,
	activeDrawerKind: null,
	activeDrawerId: null,

	openDrawer: (kind, id) => {
		// 互斥：关闭所有 dialog
		const dialogState = useDialogStore.getState()
		dialogState.closeCommand()
		dialogState.closeTaskCreateDialog()
		dialogState.closeProjectCreateDialog()
		set({
			isDrawerOpen: true,
			activeDrawerKind: kind,
			activeDrawerId: id,
		})
	},
	closeDrawer: () =>
		set({
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		}),
}))

// ----- Selectors -----
export const selectIsDrawerOpen = (state: DrawerState) => state.isDrawerOpen
export const selectActiveDrawerKind = (state: DrawerState) => state.activeDrawerKind
export const selectActiveDrawerId = (state: DrawerState) => state.activeDrawerId
