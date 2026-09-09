import { useEffect, useMemo, useRef, useState } from 'react'

import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import type { TaskDetail } from '@/shared/types'

import { createTaskDetailDraft, type TaskDetailDraft } from './taskDetailDraft'
import { useTaskAutosaveAdapter } from './useTaskAutosaveAdapter'
import { useTaskDetailController } from './useTaskDetailController'
import { useTaskDetailNavigationBlocker } from './useTaskDetailNavigationBlocker'

type UseTaskDetailViewModelOptions = {
	taskId: string
	onClose: () => void
}

export function useTaskDetailViewModel({ taskId, onClose }: UseTaskDetailViewModelOptions) {
	const detail = useTaskDetailController(taskId)
	const [lastResolvedTask, setLastResolvedTask] = useState<TaskDetail | null>(null)
	if (detail.task && detail.task !== lastResolvedTask) {
		setLastResolvedTask(detail.task)
	}

	const autosaveTask = detail.task ?? lastResolvedTask
	const baseDraft = useMemo(
		() =>
			autosaveTask ? createTaskDetailDraft(autosaveTask) : createPendingTaskDetailDraft(taskId),
		[autosaveTask, taskId],
	)
	const autosave = useTaskAutosaveAdapter({
		base: baseDraft,
		disabled: !autosaveTask || Boolean(autosaveTask.deletedAt),
	})
	const { flushNow, isDirty, reset } = autosave
	useTaskDetailNavigationBlocker({ flushNow, isDirty })
	const lastTaskIdRef = useRef(taskId)
	const [isArchiveBusy, setArchiveBusy] = useState(false)
	const [isDeleteBusy, setDeleteBusy] = useState(false)
	const scope = detail.task
		? ({ type: 'space', spaceId: detail.task.spaceId } as const)
		: ({ type: 'all' } as const)
	const projects = useProjectOptions(scope)
	const { spaces } = useSpaces()

	useEffect(() => {
		if (!detail.task) {
			return
		}

		if (lastTaskIdRef.current !== detail.task.id) {
			lastTaskIdRef.current = detail.task.id
			reset(baseDraft)
			return
		}

		if (!isDirty) {
			reset(baseDraft)
		}
	}, [baseDraft, detail.task, isDirty, reset])

	const archiveOrRestore = async () => {
		setArchiveBusy(true)
		try {
			if (!(await flushNow())) {
				return
			}
			await detail.archiveOrRestore()
		} finally {
			setArchiveBusy(false)
		}
	}

	const moveToTrash = async () => {
		setDeleteBusy(true)
		try {
			if (!(await flushNow())) {
				return
			}
			await detail.moveToTrash()
			onClose()
		} finally {
			setDeleteBusy(false)
		}
	}

	return {
		...detail,
		autosave,
		projects,
		spaces,
		isArchiveBusy,
		isDeleteBusy,
		archiveOrRestore,
		moveToTrash,
	}
}

export type TaskDetailViewModel = ReturnType<typeof useTaskDetailViewModel>

function createPendingTaskDetailDraft(taskId: string): TaskDetailDraft {
	return {
		id: taskId,
		title: '',
		note: '',
		status: 'todo',
		priority: 0,
		spaceId: '',
		projectId: '',
		dueAt: '',
		plannedAt: '',
		remindAt: '',
	}
}
