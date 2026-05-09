import { create } from 'zustand'

type PendingTaskOpenIntent = {
	taskId: string
	targetPath: string
}

type SearchOpenIntentState = {
	pendingTaskOpenIntent: PendingTaskOpenIntent | null
	setPendingTaskOpenIntent: (intent: PendingTaskOpenIntent) => void
	consumePendingTaskOpenIntent: (targetPath: string) => PendingTaskOpenIntent | null
	clearPendingTaskOpenIntent: () => void
}

export const useSearchOpenIntentStore = create<SearchOpenIntentState>((set, get) => ({
	pendingTaskOpenIntent: null,
	setPendingTaskOpenIntent: (intent) => {
		set({ pendingTaskOpenIntent: intent })
	},
	consumePendingTaskOpenIntent: (targetPath) => {
		const currentIntent = get().pendingTaskOpenIntent
		if (!currentIntent || currentIntent.targetPath !== targetPath) {
			return null
		}

		set({ pendingTaskOpenIntent: null })
		return currentIntent
	},
	clearPendingTaskOpenIntent: () => {
		set({ pendingTaskOpenIntent: null })
	},
}))

export const selectPendingTaskOpenIntent = (state: SearchOpenIntentState) =>
	state.pendingTaskOpenIntent
