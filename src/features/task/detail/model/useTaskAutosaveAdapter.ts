import { useCallback } from 'react'

import { useAutosaveController } from '@/shared/autosave'
import { useUpdateTaskMutation } from '@/features/task/hooks'

import {
	createTaskDetailDraft,
	getTaskDetailPatch,
	normalizeTaskDetailDraft,
	type TaskDetailDraft,
	type TaskDetailPatch,
} from './taskDetailDraft'

type UseTaskAutosaveAdapterOptions = {
	base: TaskDetailDraft
	disabled?: boolean
}

export function useTaskAutosaveAdapter({ base, disabled = false }: UseTaskAutosaveAdapterOptions) {
	const { mutateAsync } = useUpdateTaskMutation()
	const savePatch = useCallback(
		async (patch: TaskDetailPatch) => {
			if (disabled) {
				return base
			}
			const nextDetail = await mutateAsync(patch)
			return createTaskDetailDraft(nextDetail)
		},
		[base, disabled, mutateAsync],
	)

	return useAutosaveController<TaskDetailDraft, TaskDetailPatch>({
		base,
		getPatch: getTaskDetailPatch,
		savePatch,
		normalizeDraft: normalizeTaskDetailDraft,
	})
}
