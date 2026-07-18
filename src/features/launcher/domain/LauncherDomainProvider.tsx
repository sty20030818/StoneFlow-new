import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	type PropsWithChildren,
} from 'react'

import { getOpenContextSnapshot, search } from '@/features/launcher/api/launcherApi'
import type {
	LauncherContextValue,
	LauncherDomainActions,
} from '@/features/launcher/domain/launcherDomainTypes'
import { useLauncherCommands } from '@/features/launcher/domain/useLauncherCommands'
import { useLauncherDraftActions } from '@/features/launcher/domain/useLauncherDraftActions'
import { useLauncherDerivedState } from '@/features/launcher/domain/useLauncherDerivedState'
import { useLauncherLifecycleBridge } from '@/features/launcher/domain/useLauncherLifecycleBridge'
import { useLauncherProjectOptions } from '@/features/launcher/domain/useLauncherProjectOptions'
import { useLauncherSearchEffect } from '@/features/launcher/domain/useLauncherSearchEffect'
import { useLauncherSubmitActions } from '@/features/launcher/domain/useLauncherSubmitActions'
import { useLauncherTransientUi } from '@/features/launcher/domain/useLauncherTransientUi'
import {
	createLauncherInitialState,
	launcherDomainReducer,
} from '@/features/launcher/domain/launcherDomainReducer'
import { useLauncherSession } from '@/features/launcher/session/SessionProvider'

const LauncherDomainContext = createContext<LauncherContextValue | null>(null)

export function LauncherDomainProvider({ children }: PropsWithChildren) {
	const { actions: sessionActions, state: sessionState } = useLauncherSession()
	const [state, dispatch] = useReducer(launcherDomainReducer, undefined, createLauncherInitialState)
	const {
		closeWindow,
		focusInput,
		projectSearchRef,
		registerHandleEscape,
		scheduleClose,
		titleInputRef,
	} = useLauncherTransientUi({
		activePopover: state.activePopover,
		requestClose: (reason) => sessionActions.requestClose(reason),
	})
	const loadProjectsForSpace = useLauncherProjectOptions({ dispatch })

	const { refreshRecent } = useLauncherLifecycleBridge({
		dispatch,
		fetchSnapshot: getOpenContextSnapshot,
		focusInput,
		nextOpenContext: 'openContext' in sessionState.phase ? sessionState.phase.openContext : null,
		onRefreshRecentError: logRefreshRecentError,
		shouldFocusInput: sessionState.phase.type === 'visible',
	})

	useLauncherSearchEffect({
		dispatch,
		query: state.draft.title,
		searchFn: search,
	})

	const derived = useLauncherDerivedState(state)
	const { flatItems, hasTitle } = derived
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
		setProjectSearch,
		setStatus,
		setTitle,
		toggleAdvanced,
	} = useLauncherDraftActions({
		dispatch,
		focusInput,
		focusTarget: state.focusTarget,
		flatItemCount: flatItems.length,
		hasTitle,
		loadProjectsForSpace,
	})

	const {
		handleEscape: baseHandleEscape,
		handleInputKeyDown,
		submit,
	} = useLauncherSubmitActions({
		buildCreateInput,
		closeWindow,
		continuousCreateCount: state.continuousCreateCount,
		createAndOpenTask,
		createTask,
		dispatch,
		draft: state.draft,
		flatItems,
		focusInput,
		focusTarget: state.focusTarget,
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
			handleInputKeyDown,
			moveFocus,
			openResult: openTargetResult,
			selectPlacement,
			selectSpace,
			setDate,
			setPopover,
			setPriority,
			setProjectSearch,
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
			handleInputKeyDown,
			moveFocus,
			openTargetResult,
			selectPlacement,
			selectSpace,
			setDate,
			setPopover,
			setPriority,
			setProjectSearch,
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
			refs: {
				titleInputRef,
				projectSearchRef,
			},
			actions,
		}),
		[actions, derived, projectSearchRef, state, titleInputRef],
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
