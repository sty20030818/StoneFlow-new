import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	type PropsWithChildren,
} from 'react'

import { getOpenContextSnapshot, search } from '@/features/quick-create/api/quickCreate'
import type {
	QuickCreateContextValue,
	QuickCreateDomainActions,
} from '@/features/quick-create/domain/quickCreateDomainTypes'
import { useQuickCreateCommands } from '@/features/quick-create/domain/useQuickCreateCommands'
import { useQuickCreateDraftActions } from '@/features/quick-create/domain/useQuickCreateDraftActions'
import { useQuickCreateDerivedState } from '@/features/quick-create/domain/useQuickCreateDerivedState'
import { useQuickCreateLifecycleBridge } from '@/features/quick-create/domain/useQuickCreateLifecycleBridge'
import { useQuickCreateProjectOptions } from '@/features/quick-create/domain/useQuickCreateProjectOptions'
import { useQuickCreateSearchEffect } from '@/features/quick-create/domain/useQuickCreateSearchEffect'
import { useQuickCreateSubmitActions } from '@/features/quick-create/domain/useQuickCreateSubmitActions'
import { useQuickCreateTransientUi } from '@/features/quick-create/domain/useQuickCreateTransientUi'
import {
	createQuickCreateInitialState,
	quickCreateDomainReducer,
} from '@/features/quick-create/domain/quickCreateDomainReducer'
import { useQuickCreateSession } from '@/features/quick-create/runtime/useQuickCreateSession'

const QuickCreateDomainContext = createContext<QuickCreateContextValue | null>(null)

export function QuickCreateDomainProvider({ children }: PropsWithChildren) {
	const { actions: sessionActions, state: sessionState } = useQuickCreateSession()
	const [state, dispatch] = useReducer(
		quickCreateDomainReducer,
		undefined,
		createQuickCreateInitialState,
	)
	const {
		closeWindow,
		focusInput,
		projectSearchRef,
		registerHandleEscape,
		scheduleClose,
		titleInputRef,
	} = useQuickCreateTransientUi({
		activePopover: state.activePopover,
		requestClose: (reason) => sessionActions.requestClose(reason),
	})
	const loadProjectsForSpace = useQuickCreateProjectOptions({ dispatch })

	const { refreshRecent } = useQuickCreateLifecycleBridge({
		dispatch,
		fetchSnapshot: getOpenContextSnapshot,
		focusInput,
		nextOpenContext: 'openContext' in sessionState.phase ? sessionState.phase.openContext : null,
		onRefreshRecentError: logRefreshRecentError,
		shouldFocusInput: sessionState.phase.type === 'visible',
	})

	useQuickCreateSearchEffect({
		dispatch,
		query: state.draft.title,
		searchFn: search,
	})

	const derived = useQuickCreateDerivedState(state)
	const { flatItems, hasTitle } = derived
	const { buildCreateInput, createAndOpenTask, createTask, openTargetResult } =
		useQuickCreateCommands({
			dispatch,
			scheduleClose,
		})

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
	} = useQuickCreateDraftActions({
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
	} = useQuickCreateSubmitActions({
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

	const actions = useMemo<QuickCreateDomainActions>(
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

	const value = useMemo<QuickCreateContextValue>(
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

	return (
		<QuickCreateDomainContext.Provider value={value}>{children}</QuickCreateDomainContext.Provider>
	)
}

export function useQuickCreateDomain() {
	const context = useContext(QuickCreateDomainContext)
	if (!context) {
		throw new Error('useQuickCreateDomain 必须在 QuickCreateDomainProvider 内使用')
	}
	return context
}

export const useQuickCreate = useQuickCreateDomain

function logRefreshRecentError(error: unknown) {
	if (error instanceof Error) {
		console.warn('[quick-create] recent refresh failed:', error.message)
		return
	}

	console.warn('[quick-create] recent refresh failed')
}
