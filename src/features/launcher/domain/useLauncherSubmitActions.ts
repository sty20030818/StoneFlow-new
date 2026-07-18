import { useCallback, type KeyboardEvent } from 'react'

import type { LauncherInput } from '../api/launcherApi'
import type { LauncherAction } from './launcherDomainTypes'
import type {
	LauncherDraft,
	LauncherFocusTarget,
	LauncherResultItem,
	LauncherSubmitAction,
	LauncherSubmitState,
} from '../model/types'

type UseLauncherSubmitActionsArgs = {
	buildCreateInput: (draft: LauncherDraft) => LauncherInput
	closeWindow: () => Promise<void>
	dispatch: React.ActionDispatch<[action: LauncherAction]>
	draft: LauncherDraft
	flatItems: LauncherResultItem[]
	focusInput: () => void
	focusTarget: LauncherFocusTarget
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
	closeWindow,
	continuousCreateCount,
	createAndOpenTask,
	createTask,
	dispatch,
	draft,
	flatItems,
	focusInput,
	focusTarget,
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
			dispatch({ type: 'titleCleared' })
			focusInput()
			return
		}

		void closeWindow()
	}, [closeWindow, dispatch, draft.title, focusInput])

	const handleInputKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				handleEscape()
				return
			}

			if (event.key === 'ArrowDown') {
				event.preventDefault()
				moveFocus(1)
				return
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault()
				moveFocus(-1)
				return
			}

			if (event.key !== 'Enter') {
				return
			}

			event.preventDefault()

			if ((event.metaKey || event.ctrlKey) && hasTitle) {
				void submit('createAndOpen')
				return
			}

			if (event.shiftKey && hasTitle) {
				void submit('createAndContinue')
				return
			}

			if (focusTarget !== 'none' && focusTarget !== 'create') {
				const item = flatItems[focusTarget.index]
				if (item) {
					void openTargetResult(item)
					return
				}
			}

			if (hasTitle) {
				void submit('create')
			}
		},
		[flatItems, focusTarget, handleEscape, hasTitle, moveFocus, openTargetResult, submit],
	)

	return {
		handleEscape,
		handleInputKeyDown,
		submit,
	}
}
