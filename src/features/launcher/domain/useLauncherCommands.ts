import { useCallback } from 'react'

import { create, createAndOpen, openTarget, type LauncherInput } from '../api/launcherApi'
import type { LauncherAction } from './launcherDomainTypes'
import type { LauncherDraft, LauncherResultItem } from '../model/types'

type UseLauncherCommandsArgs = {
	dispatch: React.ActionDispatch<[action: LauncherAction]>
	scheduleClose: () => void
}

export function useLauncherCommands({ dispatch, scheduleClose }: UseLauncherCommandsArgs) {
	const buildCreateInput = useCallback(
		(draft: LauncherDraft): LauncherInput => ({
			spaceId: draft.spaceId,
			placement: draft.placement,
			title: draft.title.trim(),
			note: null,
			status: draft.status,
			priority: draft.priority,
			dueAt: draft.dueAt,
			scheduledAt: draft.scheduledAt,
			reminderAt: draft.reminderAt,
		}),
		[],
	)

	const createTask = useCallback(async (input: LauncherInput) => {
		await create(input)
	}, [])

	const createAndOpenTask = useCallback(async (input: LauncherInput) => {
		await createAndOpen(input)
	}, [])

	const openTargetResult = useCallback(
		async (item: LauncherResultItem) => {
			dispatch({
				type: 'submitStarted',
				message: item.kind === 'task' ? '正在打开任务...' : '正在打开项目...',
			})

			try {
				await openTarget({ kind: item.kind, id: item.id })
				dispatch({
					type: 'submitCompleted',
					message: item.kind === 'task' ? `已打开任务：${item.title}` : `已打开项目：${item.name}`,
				})
				scheduleClose()
			} catch (error) {
				dispatch({
					type: 'submitFailed',
					message: error instanceof Error ? error.message : '打开失败',
				})
			}
		},
		[dispatch, scheduleClose],
	)

	return {
		buildCreateInput,
		createAndOpenTask,
		createTask,
		openTargetResult,
	}
}
