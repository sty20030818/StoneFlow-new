import { useCallback, type KeyboardEvent } from 'react'

import type { LauncherInput } from '../api/launcherApi'
import type { LauncherAction } from './launcherDomainTypes'
import { matchLauncherShortcut, type LauncherShortcutId } from '../model/launcherShortcutKeymap'
import type {
	LauncherDraft,
	LauncherResultItem,
	LauncherSubmitAction,
	LauncherSubmitState,
} from '../model/types'

type UseLauncherSubmitActionsArgs = {
	buildCreateInput: (draft: LauncherDraft) => LauncherInput
	clearResultFocus: () => void
	closeWindow: () => Promise<void>
	dispatch: React.ActionDispatch<[action: LauncherAction]>
	draft: LauncherDraft
	focusInput: () => void
	focusedResult: LauncherResultItem | null
	hasTitle: boolean
	moveFocus: (direction: 1 | -1) => void
	openTargetResult: (item: LauncherResultItem) => Promise<void>
	refreshRecent: () => void
	scheduleClose: () => void
	submitState: LauncherSubmitState
	continuousCreateCount: number
	createTask: (input: LauncherInput) => Promise<void>
	createAndOpenTask: (input: LauncherInput) => Promise<void>
}

export function useLauncherSubmitActions({
	buildCreateInput,
	clearResultFocus,
	closeWindow,
	continuousCreateCount,
	createAndOpenTask,
	createTask,
	dispatch,
	draft,
	focusInput,
	focusedResult,
	hasTitle,
	moveFocus,
	openTargetResult,
	refreshRecent,
	scheduleClose,
	submitState,
}: UseLauncherSubmitActionsArgs) {
	const submit = useCallback(
		async (action: Exclude<LauncherSubmitAction, 'openResult'>) => {
			if (!hasTitle || submitState === 'submitting') {
				if (!hasTitle) {
					dispatch({ type: 'submitFailed', message: '请输入任务标题' })
				}
				return
			}

			const input = buildCreateInput(draft)
			dispatch({
				type: 'submitStarted',
				message: action === 'createAndOpen' ? '正在创建并打开任务...' : '正在创建任务...',
			})

			try {
				if (action === 'createAndOpen') {
					await createAndOpenTask(input)
					refreshRecent()
					dispatch({ type: 'submitCompleted', message: `已创建并打开「${input.title}」` })
					scheduleClose()
					return
				}

				await createTask(input)
				refreshRecent()
				if (action === 'createAndContinue') {
					clearResultFocus()
					dispatch({
						type: 'continuousCreateSucceeded',
						message: `已连续创建 ${continuousCreateCount + 1} 条`,
					})
					focusInput()
					return
				}

				dispatch({ type: 'submitCompleted', message: `已创建「${input.title}」` })
				scheduleClose()
			} catch (error) {
				dispatch({
					type: 'submitFailed',
					message: error instanceof Error ? error.message : '创建失败',
				})
			}
		},
		[
			buildCreateInput,
			clearResultFocus,
			continuousCreateCount,
			createAndOpenTask,
			createTask,
			dispatch,
			draft,
			focusInput,
			hasTitle,
			refreshRecent,
			scheduleClose,
			submitState,
		],
	)

	const handleEscape = useCallback(() => {
		if (draft.title.trim()) {
			clearResultFocus()
			dispatch({ type: 'titleCleared' })
			focusInput()
			return
		}

		void closeWindow()
	}, [clearResultFocus, closeWindow, dispatch, draft.title, focusInput])

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.defaultPrevented || event.nativeEvent.isComposing) {
				return
			}

			const shortcut = matchLauncherShortcut(event, {
				isEnabled: (id) => isShortcutEnabled(id, hasTitle),
			})

			if (!shortcut) {
				return
			}

			event.preventDefault()

			if (shortcut === 'clearOrClose') {
				handleEscape()
				return
			}

			if (shortcut === 'selectNext') {
				moveFocus(1)
				return
			}

			if (shortcut === 'selectPrevious') {
				moveFocus(-1)
				return
			}

			if (shortcut === 'createAndOpen') {
				void submit('createAndOpen')
				return
			}

			if (shortcut === 'createAndContinue') {
				void submit('createAndContinue')
				return
			}

			if (focusedResult) {
				void openTargetResult(focusedResult)
				return
			}

			if (hasTitle) {
				void submit('create')
			}
		},
		[focusedResult, handleEscape, hasTitle, moveFocus, openTargetResult, submit],
	)

	return {
		handleEscape,
		handleKeyDown,
		submit,
	}
}

function isShortcutEnabled(id: LauncherShortcutId, hasTitle: boolean) {
	return id !== 'createAndOpen' && id !== 'createAndContinue' ? true : hasTitle
}
