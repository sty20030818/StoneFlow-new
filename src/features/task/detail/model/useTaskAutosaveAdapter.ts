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
}

export function useTaskAutosaveAdapter({ base }: UseTaskAutosaveAdapterOptions) {
	const updateTask = useTaskStore((state) => state.updateTask)
	const savePatch = useCallback(
		async (patch: TaskDetailPatch) => {
			const nextDetail = await updateTask(patch)
			return createTaskDetailDraft(nextDetail)
		},
		[updateTask],
	)

	return useAutosaveController<TaskDetailDraft, TaskDetailPatch>({
		base,
		getPatch: getTaskDetailPatch,
		savePatch,
		normalizeDraft: normalizeTaskDetailDraft,
	})
}
