export type AutosaveStatus = 'idle' | 'dirty' | 'scheduled' | 'saving' | 'saved' | 'failed'

export type AutosaveSaveMode = 'debounced' | 'immediate' | 'manual'

export type AutosaveMachineState = {
	status: AutosaveStatus
	error: string | null
	savedAt: number | null
}

export type AutosaveMachineEvent =
	| { type: 'CHANGE_FIELD' }
	| { type: 'SCHEDULE_SAVE' }
	| { type: 'FLUSH_NOW' }
	| { type: 'SAVE_START' }
	| { type: 'SAVE_SUCCESS'; savedAt?: number }
	| { type: 'SAVE_FAILURE'; error: string }
	| { type: 'RESET_FROM_REMOTE' }
	| { type: 'DISCARD' }
	| { type: 'RETRY' }
	| { type: 'CLEAR_SAVED' }

export type AutosaveAdapter<TDraft, TPatch> = {
	getPatch: (base: TDraft, draft: TDraft) => TPatch | null
	savePatch: (patch: TPatch) => Promise<TDraft>
	normalizeDraft?: (draft: TDraft) => TDraft
}

export type UseAutosaveControllerOptions<TDraft, TPatch> = AutosaveAdapter<TDraft, TPatch> & {
	base: TDraft
	debounceMs?: number
	savedVisibleMs?: number
}

export type AutosaveSetOptions = {
	saveMode?: AutosaveSaveMode
}

export type AutosaveController<TDraft> = {
	draft: TDraft
	status: AutosaveStatus
	error: string | null
	savedAt: number | null
	isDirty: boolean
	setField: <K extends keyof TDraft>(key: K, value: TDraft[K], options?: AutosaveSetOptions) => void
	setDraft: (updater: TDraft | ((current: TDraft) => TDraft), options?: AutosaveSetOptions) => void
	flushNow: () => Promise<void>
	retry: () => Promise<void>
	discard: () => void
	reset: (nextBase: TDraft) => void
}
