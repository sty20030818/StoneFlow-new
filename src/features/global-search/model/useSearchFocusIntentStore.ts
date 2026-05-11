import { create } from 'zustand'

type SearchFocusIntentState = {
	focusRequestVersion: number
	requestFocus: () => void
}

export const useSearchFocusIntentStore = create<SearchFocusIntentState>((set) => ({
	focusRequestVersion: 0,
	requestFocus: () => {
		set((state) => ({
			focusRequestVersion: state.focusRequestVersion + 1,
		}))
	},
}))

export const selectSearchFocusRequestVersion = (state: SearchFocusIntentState) =>
	state.focusRequestVersion
