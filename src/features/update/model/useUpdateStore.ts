/**
 * 更新 UI 只投影后端 revision snapshot；本地仅保留交互态。
 */

import { create } from 'zustand'

import type { UpdateSessionSnapshot } from '../api/updates'

export interface UpdateState {
	snapshot: UpdateSessionSnapshot | null
	manualCheckPending: boolean
	noUpdate: boolean
	dialogVisible: boolean
	dialogClosedRevision: number | null
	readyChipDismissedVersion: string | null

	applySnapshot: (snapshot: UpdateSessionSnapshot) => boolean
	setManualCheckPending: (pending: boolean) => void
	setNoUpdate: (noUpdate: boolean) => void
	closeDialog: () => void
	openDialogFromSnapshot: (revision: number) => void
	dismissReadyChip: () => void
	openDialog: () => void
	reset: () => void
}

const INITIAL_SESSION: UpdateSessionSnapshot = {
	revision: 0,
	phase: 'idle',
	update: null,
	progress: null,
	errorMessage: null,
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
	snapshot: null,
	manualCheckPending: false,
	noUpdate: false,
	dialogVisible: false,
	dialogClosedRevision: null,
	readyChipDismissedVersion: null,

	applySnapshot: (snapshot) => {
		let accepted = false
		set((state) => {
			if (state.snapshot && snapshot.revision <= state.snapshot.revision) return state

			accepted = true
			const enteredReady =
				snapshot.phase === 'ready' &&
				(state.snapshot?.phase !== 'ready' ||
					state.snapshot.update?.version !== snapshot.update?.version)

			return {
				snapshot,
				noUpdate: false,
				readyChipDismissedVersion: enteredReady ? null : state.readyChipDismissedVersion,
			}
		})
		return accepted
	},

	setManualCheckPending: (pending) =>
		set({ manualCheckPending: pending, ...(pending ? { noUpdate: false } : {}) }),
	setNoUpdate: (noUpdate) => set({ noUpdate, ...(noUpdate ? { dialogVisible: false } : {}) }),
	closeDialog: () =>
		set((state) => ({
			dialogVisible: false,
			dialogClosedRevision: state.snapshot?.revision ?? state.dialogClosedRevision,
		})),
	openDialogFromSnapshot: (revision) => {
		const state = get()
		if (
			state.snapshot?.revision === revision &&
			state.dialogClosedRevision !== revision &&
			(state.snapshot.update || state.snapshot.errorMessage)
		) {
			set({ dialogVisible: true })
		}
	},
	dismissReadyChip: () =>
		set({ readyChipDismissedVersion: get().snapshot?.update?.version ?? null }),
	openDialog: () => {
		const snapshot = get().snapshot
		if (snapshot?.update || snapshot?.errorMessage) {
			set({ dialogVisible: true, dialogClosedRevision: null })
		}
	},
	reset: () =>
		set({
			snapshot: null,
			manualCheckPending: false,
			noUpdate: false,
			dialogVisible: false,
			dialogClosedRevision: null,
			readyChipDismissedVersion: null,
		}),
}))

export function selectUpdateSnapshot(state: UpdateState): UpdateSessionSnapshot {
	return state.snapshot ?? INITIAL_SESSION
}

export function selectReadyChipVisible(state: UpdateState): boolean {
	const snapshot = state.snapshot
	if (snapshot?.phase !== 'ready' || !snapshot.update) return false
	return state.readyChipDismissedVersion !== snapshot.update.version
}
