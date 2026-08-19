import { useEffect, useMemo, useRef, useState } from 'react'

import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import type { TaskDetail } from '@/shared/types'

import { createTaskDetailDraft, type TaskDetailDraft } from './taskDetailDraft'
import { useTaskAutosaveAdapter } from './useTaskAutosaveAdapter'
import { useTaskDetailController } from './useTaskDetailController'

type UseTaskDetailViewModelOptions = {
	taskId: string
	onClose: () => void
}

export function useTaskDetailViewModel({ taskId, onClose }: UseTaskDetailViewModelOptions) {
	const detail = useTaskDetailController(taskId)
	const lastResolvedTaskRef = useRef<TaskDetail | null>(null)
	if (detail.task) {
		lastResolvedTaskRef.current = detail.task
	}

	const autosaveTask = detail.task ?? lastResolvedTaskRef.current
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
	const lastTaskIdRef = useRef(taskId)
	const flushRef = useRef(flushNow)
	const [isArchiveBusy, setArchiveBusy] = useState(false)
	const [isDeleteBusy, setDeleteBusy] = useState(false)
	const scope = detail.task
		? ({ type: 'space', spaceId: detail.task.spaceId } as const)
		: ({ type: 'all' } as const)
	const projects = useProjectOptions(scope)
	const { spaces } = useSpaces()

	useEffect(() => {
		flushRef.current = flushNow
	}, [flushNow])

	useEffect(() => {
		if (!detail.task) {
			return
		}

		if (lastTaskIdRef.current === detail.task.id) {
			if (!isDirty) {
				reset(baseDraft)
			}
			return
		}

		void flushRef.current().finally(() => {
			lastTaskIdRef.current = detail.task?.id ?? taskId
			reset(baseDraft)
		})
	}, [baseDraft, detail.task, isDirty, reset, taskId])

	useEffect(() => {
		return () => {
			void flushRef.current()
		}
	}, [])

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
