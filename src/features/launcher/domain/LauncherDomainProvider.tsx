import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	type PropsWithChildren,
} from 'react'

import { getRecentData, search } from '../api/launcherApi'
import type { LauncherContextValue, LauncherDomainActions } from './launcherDomainTypes'
import { useLauncherCommands } from './useLauncherCommands'
import { useLauncherDraftActions } from './useLauncherDraftActions'
import { useLauncherDerivedState } from './useLauncherDerivedState'
import { useLauncherLifecycleBridge } from './useLauncherLifecycleBridge'
import { useLauncherProjectOptions } from './useLauncherProjectOptions'
import { useLauncherSearchEffect } from './useLauncherSearchEffect'
import { useLauncherSubmitActions } from './useLauncherSubmitActions'
import { useLauncherTransientUi } from './useLauncherTransientUi'
import { createLauncherInitialState, launcherDomainReducer } from './launcherDomainReducer'
import { useLauncherSession } from '../session/SessionProvider'
import { getLauncherResultKey } from '../model/types'
import { createCollectionFocusBridge, useCollectionInteraction } from '@/features/selection'

const LauncherDomainContext = createContext<LauncherContextValue | null>(null)

export function LauncherDomainProvider({ children }: PropsWithChildren) {
	const { actions: sessionActions, state: sessionState } = useLauncherSession()
	const [state, dispatch] = useReducer(launcherDomainReducer, undefined, createLauncherInitialState)
	const { closeWindow, focusInput, registerHandleEscape, scheduleClose, titleInputRef } =
		useLauncherTransientUi({
			requestClose: (reason) => sessionActions.requestClose(reason),
		})
	const loadProjectsForSpace = useLauncherProjectOptions({ dispatch })

	useLauncherSearchEffect({
		dispatch,
		query: state.draft.title,
		searchFn: search,
	})

	const baseDerived = useLauncherDerivedState(state)
	const { flatItems, hasTitle } = baseDerived
	const resultKeys = useMemo(() => flatItems.map(getLauncherResultKey), [flatItems])
	const resultCollection = useCollectionInteraction({
		eligibleKeys: resultKeys,
		navigableKeys: resultKeys,
	})
	const { focusKey: focusResultKey } = resultCollection
	const clearResultFocus = useCallback(() => focusResultKey(null), [focusResultKey])
	const resultFocusBridge = useMemo(
		() => createCollectionFocusBridge({ requestScroll: () => undefined }),
		[],
	)
	const { refreshRecent } = useLauncherLifecycleBridge({
		clearResultFocus,
		dispatch,
		fetchRecent: getRecentData,
		focusInput,
		nextOpenContext: 'openContext' in sessionState.phase ? sessionState.phase.openContext : null,
		onRefreshRecentError: logRefreshRecentError,
		shouldFocusInput: sessionState.phase.type === 'visible',
	})
	const requestResultFocus = useCallback(
		(key: string) => {
			resultFocusBridge.requestFocus({ type: 'item', key })
			const activeElement = document.activeElement
			if (
				activeElement instanceof HTMLElement &&
				resultFocusBridge.getItemKey(activeElement) === key
			) {
				activeElement.scrollIntoView?.({ block: 'nearest' })
			}
		},
		[resultFocusBridge],
	)
	const activeResultIndex = resultCollection.focusedKey
		? resultKeys.indexOf(resultCollection.focusedKey)
		: -1
	const focusedResult = activeResultIndex < 0 ? null : (flatItems[activeResultIndex] ?? null)
	const derived = useMemo(
		() => ({
			...baseDerived,
			activeResultIndex,
			enterLabel: activeResultIndex < 0 ? ('创建' as const) : ('打开' as const),
			isCreateFocused: state.focusTarget === 'create',
		}),
		[activeResultIndex, baseDerived, state.focusTarget],
	)
	const { buildCreateInput, createAndOpenTask, createTask, openTargetResult } = useLauncherCommands(
		{
			dispatch,
			scheduleClose,
		},
	)

	const {
		focusCreate,
		focusResult,
		moveFocus,
		selectPlacement,
		selectSpace,
		setDate,
		setPopover,
		setPriority,
		setStatus,
		setTitle,
		toggleAdvanced,
	} = useLauncherDraftActions({
		dispatch,
		focusInput,
		focusTarget: state.focusTarget,
		hasTitle,
		loadProjectsForSpace,
		requestResultFocus,
		resultCollection,
	})

	const {
		handleEscape: baseHandleEscape,
		handleKeyDown,
		submit,
	} = useLauncherSubmitActions({
		buildCreateInput,
		clearResultFocus,
		closeWindow,
		continuousCreateCount: state.continuousCreateCount,
		createAndOpenTask,
		createTask,
		dispatch,
		draft: state.draft,
		focusInput,
		focusedResult,
		hasTitle,
		moveFocus,
		openTargetResult,
		refreshRecent,
		scheduleClose,
		submitState: state.submitState,
	})

	const handleEscape = useCallback(() => {
		if (state.activePopover) {
			dispatch({ type: 'activePopoverClosed' })
			focusInput()
			return
		}

		baseHandleEscape()
	}, [baseHandleEscape, dispatch, focusInput, state.activePopover])

	registerHandleEscape(handleEscape)

	const actions = useMemo<LauncherDomainActions>(
		() => ({
			focusCreate,
			focusInput,
			focusResult,
			handleEscape,
			handleKeyDown,
			moveFocus,
			openResult: openTargetResult,
			selectPlacement,
			selectSpace,
			setDate,
			setPopover,
			setPriority,
			setStatus,
			setTitle,
			submit,
			toggleAdvanced,
		}),
		[
			focusCreate,
			focusInput,
			focusResult,
			handleEscape,
			handleKeyDown,
			moveFocus,
			openTargetResult,
			selectPlacement,
			selectSpace,
			setDate,
			setPopover,
			setPriority,
			setStatus,
			setTitle,
			submit,
			toggleAdvanced,
		],
	)

	const value = useMemo<LauncherContextValue>(
		() => ({
			state,
			derived,
			resultCollection,
			refs: {
				titleInputRef,
				resultFocusBridge,
			},
			actions,
		}),
		[actions, derived, resultCollection, resultFocusBridge, state, titleInputRef],
	)

	return <LauncherDomainContext.Provider value={value}>{children}</LauncherDomainContext.Provider>
}

export function useLauncher() {
	const context = useContext(LauncherDomainContext)
	if (!context) {
		throw new Error('useLauncher 必须在 LauncherDomainProvider 内使用')
	}
	return context
}

function logRefreshRecentError(error: unknown) {
	if (error instanceof Error) {
		console.warn('[launcher] recent refresh failed:', error.message)
		return
	}

	console.warn('[launcher] recent refresh failed')
}
