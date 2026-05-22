import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import { autosaveMachineReducer, initialAutosaveMachineState } from './autosaveMachine'
import type {
	AutosaveController,
	AutosaveSaveMode,
	UseAutosaveControllerOptions,
} from './autosaveTypes'

const DEFAULT_DEBOUNCE_MS = 600
const DEFAULT_SAVED_VISIBLE_MS = 1200

export function useAutosaveController<TDraft, TPatch>({
	base,
	getPatch,
	savePatch,
	normalizeDraft,
	debounceMs = DEFAULT_DEBOUNCE_MS,
	savedVisibleMs = DEFAULT_SAVED_VISIBLE_MS,
}: UseAutosaveControllerOptions<TDraft, TPatch>): AutosaveController<TDraft> {
	const [draft, setDraftState] = useState(base)
	const [machine, dispatch] = useReducer(autosaveMachineReducer, initialAutosaveMachineState)

	const baseRef = useRef(base)
	const draftRef = useRef(base)
	const draftVersionRef = useRef(0)
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const savePromiseRef = useRef<Promise<void> | null>(null)
	const pendingAfterSaveModeRef = useRef<AutosaveSaveMode | null>(null)

	const normalize = useCallback(
		(value: TDraft) => (normalizeDraft ? normalizeDraft(value) : value),
		[normalizeDraft],
	)

	const clearDebounceTimer = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
			debounceTimerRef.current = null
		}
	}, [])

	const clearSavedTimer = useCallback(() => {
		if (savedTimerRef.current) {
			clearTimeout(savedTimerRef.current)
			savedTimerRef.current = null
		}
	}, [])

	const markSavedVisible = useCallback(() => {
		clearSavedTimer()
		savedTimerRef.current = setTimeout(() => {
			dispatch({ type: 'CLEAR_SAVED' })
			savedTimerRef.current = null
		}, savedVisibleMs)
	}, [clearSavedTimer, savedVisibleMs])

	const getCurrentPatch = useCallback(() => {
		return getPatch(baseRef.current, normalize(draftRef.current))
	}, [getPatch, normalize])

	const runSave = useCallback(async (): Promise<void> => {
		clearDebounceTimer()

		if (savePromiseRef.current) {
			await savePromiseRef.current
			return
		}

		const normalizedDraft = normalize(draftRef.current)
		const patch = getPatch(baseRef.current, normalizedDraft)

		if (!patch) {
			draftRef.current = normalizedDraft
			setDraftState(normalizedDraft)
			dispatch({ type: 'RESET_FROM_REMOTE' })
			return
		}

		clearSavedTimer()
		dispatch({ type: 'SAVE_START' })

		const saveStartVersion = draftVersionRef.current
		const savePromise = (async () => {
			try {
				const nextBase = await savePatch(patch)
				baseRef.current = nextBase

				const draftChangedDuringSave = draftVersionRef.current !== saveStartVersion
				if (!draftChangedDuringSave) {
					draftRef.current = nextBase
					setDraftState(nextBase)
				}

				dispatch({ type: 'SAVE_SUCCESS', savedAt: Date.now() })
				markSavedVisible()
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : '保存失败'
				clearSavedTimer()
				dispatch({ type: 'SAVE_FAILURE', error: message })
				return
			} finally {
				savePromiseRef.current = null
			}

			const nextPatch = getPatch(baseRef.current, normalize(draftRef.current))
			if (!nextPatch) {
				pendingAfterSaveModeRef.current = null
				return
			}

			const nextMode = pendingAfterSaveModeRef.current ?? 'debounced'
			pendingAfterSaveModeRef.current = null

			if (nextMode === 'manual') {
				clearSavedTimer()
				dispatch({ type: 'CHANGE_FIELD' })
				return
			}

			if (nextMode === 'immediate') {
				clearSavedTimer()
				dispatch({ type: 'SCHEDULE_SAVE' })
				debounceTimerRef.current = setTimeout(() => {
					debounceTimerRef.current = null
					void runSave()
				}, 0)
				return
			}

			clearSavedTimer()
			dispatch({ type: 'SCHEDULE_SAVE' })
			debounceTimerRef.current = setTimeout(() => {
				debounceTimerRef.current = null
				void runSave()
			}, debounceMs)
		})()

		savePromiseRef.current = savePromise
		await savePromise
	}, [
		clearDebounceTimer,
		clearSavedTimer,
		debounceMs,
		getPatch,
		markSavedVisible,
		normalize,
		savePatch,
	])

	const scheduleSave = useCallback(
		(saveMode: AutosaveSaveMode) => {
			clearSavedTimer()

			if (savePromiseRef.current) {
				pendingAfterSaveModeRef.current =
					saveMode === 'immediate' || pendingAfterSaveModeRef.current === 'immediate'
						? 'immediate'
						: saveMode
				return
			}

			if (saveMode === 'manual') {
				clearDebounceTimer()
				return
			}

			if (saveMode === 'immediate') {
				void runSave()
				return
			}

			clearDebounceTimer()
			dispatch({ type: 'SCHEDULE_SAVE' })
			debounceTimerRef.current = setTimeout(() => {
				debounceTimerRef.current = null
				void runSave()
			}, debounceMs)
		},
		[clearDebounceTimer, clearSavedTimer, debounceMs, runSave],
	)

	const setDraft = useCallback(
		(
			updater: TDraft | ((current: TDraft) => TDraft),
			options: { saveMode?: AutosaveSaveMode } = {},
		) => {
			const nextDraft =
				typeof updater === 'function'
					? (updater as (current: TDraft) => TDraft)(draftRef.current)
					: updater
			draftVersionRef.current += 1
			draftRef.current = nextDraft
			setDraftState(nextDraft)
			dispatch({ type: 'CHANGE_FIELD' })
			scheduleSave(options.saveMode ?? 'debounced')
		},
		[scheduleSave],
	)

	const setField = useCallback(
		<K extends keyof TDraft>(
			key: K,
			value: TDraft[K],
			options: { saveMode?: AutosaveSaveMode } = {},
		) => {
			setDraft(
				(current) => ({
					...current,
					[key]: value,
				}),
				options,
			)
		},
		[setDraft],
	)

	const flushNow = useCallback(async () => {
		dispatch({ type: 'FLUSH_NOW' })
		await runSave()
	}, [runSave])

	const retry = useCallback(async () => {
		dispatch({ type: 'RETRY' })
		await runSave()
	}, [runSave])

	const discard = useCallback(() => {
		clearDebounceTimer()
		clearSavedTimer()
		pendingAfterSaveModeRef.current = null
		draftVersionRef.current += 1
		draftRef.current = baseRef.current
		setDraftState(baseRef.current)
		dispatch({ type: 'DISCARD' })
	}, [clearDebounceTimer, clearSavedTimer])

	const reset = useCallback(
		(nextBase: TDraft) => {
			clearDebounceTimer()
			clearSavedTimer()
			pendingAfterSaveModeRef.current = null
			baseRef.current = nextBase
			draftRef.current = nextBase
			draftVersionRef.current += 1
			setDraftState(nextBase)
			dispatch({ type: 'RESET_FROM_REMOTE' })
		},
		[clearDebounceTimer, clearSavedTimer],
	)

	useEffect(
		() => () => {
			clearDebounceTimer()
			clearSavedTimer()
		},
		[clearDebounceTimer, clearSavedTimer],
	)

	const isDirty = getCurrentPatch() !== null

	return {
		draft,
		status: machine.status,
		error: machine.error,
		savedAt: machine.savedAt,
		isDirty,
		setField,
		setDraft,
		flushNow,
		retry,
		discard,
		reset,
	}
}
