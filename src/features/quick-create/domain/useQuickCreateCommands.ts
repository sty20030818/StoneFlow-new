import { useCallback } from 'react'

import {
	create,
	createAndOpen,
	openTarget,
	type QuickCreateInput,
} from '@/features/quick-create/api/quickCreate'
import type { QuickCreateAction } from '@/features/quick-create/domain/quickCreateDomainReducer'
import type { QuickCreateDraft, QuickCreateResultItem } from '@/features/quick-create/model/types'

type UseQuickCreateCommandsArgs = {
	dispatch: React.ActionDispatch<[action: QuickCreateAction]>
	scheduleClose: () => void
}

export function useQuickCreateCommands({ dispatch, scheduleClose }: UseQuickCreateCommandsArgs) {
	const buildCreateInput = useCallback(
		(draft: QuickCreateDraft): QuickCreateInput => ({
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

	const createTask = useCallback(async (input: QuickCreateInput) => {
		await create(input)
	}, [])

	const createAndOpenTask = useCallback(async (input: QuickCreateInput) => {
		await createAndOpen(input)
	}, [])

	const openTargetResult = useCallback(
		async (item: QuickCreateResultItem) => {
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
