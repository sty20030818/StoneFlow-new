import { useEffect, useMemo, useRef, useState } from 'react'

import type { ProjectOption } from '@/features/project/model/types'
import { useProjectOptions } from '@/features/project/hooks'
import { useSpaces } from '@/features/space/hooks'
import { DetailDrawerShell } from '@/shared/components/detail'
import { Button } from '@/shared/components/base/button'
import type { Space, TaskDetail } from '@/shared/types'

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
	const scope = task
		? ({ type: 'space', spaceId: task.spaceId } as const)
		: ({ type: 'all' } as const)
	const projects = useProjectOptions(scope)
	const { spaces } = useSpaces()

	if (status === 'loading') {
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
			spaces={spaces}
			task={task}
		/>
	)
}

type TaskDrawerLoadedProps = {
	task: TaskDetail
	projects: ProjectOption[]
	spaces: Space[]
	onClose: () => void
	archiveOrRestore: () => Promise<void>
	moveToTrash: () => Promise<void>
}

function TaskDrawerLoaded({
	task,
	projects,
	spaces,
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
			<TaskDrawerHeader autosave={autosave} taskId={task.id} />
			<TaskDrawerBody autosave={autosave} projects={projects} spaces={spaces} taskId={task.id} />
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
