import { useEffect, useMemo, useRef, useState } from 'react'

import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import type { ProjectOption } from '@/features/project/model/types'
import { DetailDrawerShell } from '@/shared/ui/detail'
import { Button } from '@/shared/ui/base/button'
import type { TaskDetail } from '@/shared/types'

import { createTaskDetailDraft } from '../model/taskDetailDraft'
import { useTaskAutosaveAdapter } from '../model/useTaskAutosaveAdapter'
import { useTaskDetailController } from '../model/useTaskDetailController'
import { TaskDrawerBody } from './TaskDrawerBody'
import { TaskDrawerFooter } from './TaskDrawerFooter'
import { TaskDrawerHeader } from './TaskDrawerHeader'

type TaskDrawerProps = {
	taskId: string
	onClose: () => void
}

export function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
	const { task, status, error, archiveOrRestore, moveToTrash } = useTaskDetailController(taskId)
	const projects = useProjectStore(selectProjectOptions)

	if (status === 'loading' || status === 'idle') {
		return <TaskDrawerState message='加载中...' />
	}

	if (status === 'error') {
		return <TaskDrawerState message={error ?? '任务详情加载失败'} onClose={onClose} />
	}

	if (!task) {
		return <TaskDrawerState message='任务不存在' onClose={onClose} />
	}

	return (
		<TaskDrawerLoaded
			archiveOrRestore={archiveOrRestore}
			moveToTrash={moveToTrash}
			onClose={onClose}
			projects={projects}
			task={task}
		/>
	)
}

type TaskDrawerLoadedProps = {
	task: TaskDetail
	projects: ProjectOption[]
	onClose: () => void
	archiveOrRestore: () => Promise<void>
	moveToTrash: () => Promise<void>
}

function TaskDrawerLoaded({
	task,
	projects,
	onClose,
	archiveOrRestore,
	moveToTrash,
}: TaskDrawerLoadedProps) {
	const baseDraft = useMemo(() => createTaskDetailDraft(task), [task])
	const autosave = useTaskAutosaveAdapter({ base: baseDraft })
	const { flushNow, reset } = autosave
	const [isArchiveBusy, setArchiveBusy] = useState(false)
	const [isDeleteBusy, setDeleteBusy] = useState(false)
	const lastTaskIdRef = useRef(task.id)
	const flushRef = useRef(flushNow)

	useEffect(() => {
		flushRef.current = flushNow
	}, [flushNow])

	useEffect(() => {
		if (lastTaskIdRef.current === task.id) {
			reset(baseDraft)
			return
		}

		void flushRef.current().finally(() => {
			lastTaskIdRef.current = task.id
			reset(baseDraft)
		})
	}, [baseDraft, reset, task.id])

	useEffect(() => {
		return () => {
			void flushRef.current()
		}
	}, [])

	const handleArchiveOrRestore = async () => {
		setArchiveBusy(true)
		try {
			await flushNow()
			await archiveOrRestore()
		} finally {
			setArchiveBusy(false)
		}
	}

	const handleMoveToTrash = async () => {
		setDeleteBusy(true)
		try {
			await flushNow()
			await moveToTrash()
			onClose()
		} finally {
			setDeleteBusy(false)
		}
	}

	return (
		<DetailDrawerShell aria-label='任务详情'>
			<TaskDrawerHeader autosave={autosave} />
			<TaskDrawerBody autosave={autosave} projects={projects} taskId={task.id} />
			<TaskDrawerFooter
				isArchiveBusy={isArchiveBusy}
				isDeleteBusy={isDeleteBusy}
				onMoveToTrash={() => void handleMoveToTrash()}
				onArchiveOrRestore={() => void handleArchiveOrRestore()}
				task={task}
			/>
		</DetailDrawerShell>
	)
}

function TaskDrawerState({ message, onClose }: { message: string; onClose?: () => void }) {
	return (
		<DetailDrawerShell aria-label='任务详情'>
			<div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-[12px] text-sf-text-tertiary'>
				<p>{message}</p>
				{onClose ? (
					<Button className='h-7 px-3 text-[12px]' onClick={onClose} size='sm' variant='outline'>
						关闭
					</Button>
				) : null}
			</div>
		</DetailDrawerShell>
	)
}
