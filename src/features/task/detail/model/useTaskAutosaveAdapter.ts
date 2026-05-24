import { useCallback } from 'react'

import { useAutosaveController } from '@/shared/autosave'
import { useTaskStore } from '@/features/task/model/useTaskStore'

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
	const updateTask = useTaskStore((state) => state.updateTask)
	const savePatch = useCallback(
		async (patch: TaskDetailPatch) => {
			if (disabled) {
				return base
			}
			const nextDetail = await updateTask(patch)
			return createTaskDetailDraft(nextDetail)
		},
		[base, disabled, updateTask],
	)

	return useAutosaveController<TaskDetailDraft, TaskDetailPatch>({
		base,
		getPatch: getTaskDetailPatch,
		savePatch,
		normalizeDraft: normalizeTaskDetailDraft,
	})
}
