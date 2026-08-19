import type { Ref } from 'react'

import { Button } from '@heroui/react'

import type { TaskDetailViewModel } from '../model/useTaskDetailViewModel'
import { TaskDrawerBody } from './TaskDrawerBody'
import { TaskDrawerFooter } from './TaskDrawerFooter'
import { TaskDetailHeader } from './TaskDetailHeader'

type TaskDetailContentProps = {
	viewModel: TaskDetailViewModel
	onClose: () => void
	scrollRef?: Ref<HTMLDivElement>
	showCloseButton?: boolean
}

export function TaskDetailContent({
	viewModel,
	onClose,
	scrollRef,
	showCloseButton = false,
}: TaskDetailContentProps) {
	if (viewModel.status === 'loading') {
		return <TaskDetailState message='加载中...' />
	}

	if (viewModel.status === 'error') {
		return <TaskDetailState message={viewModel.error ?? '任务详情加载失败'} onClose={onClose} />
	}

	if (!viewModel.task) {
		return <TaskDetailState message='任务不存在' onClose={onClose} />
	}

	return (
		<div className='flex min-h-0 flex-1 flex-col' data-task-detail-content='true'>
			<TaskDetailHeader
				autosave={viewModel.autosave}
				onClose={showCloseButton ? onClose : undefined}
				taskId={viewModel.task.id}
			/>
			<TaskDrawerBody
				autosave={viewModel.autosave}
				projects={viewModel.projects}
				scrollRef={scrollRef}
				spaces={viewModel.spaces}
				taskId={viewModel.task.id}
			/>
			<TaskDrawerFooter
				isArchiveBusy={viewModel.isArchiveBusy}
				isDeleteBusy={viewModel.isDeleteBusy}
				onMoveToTrash={() => void viewModel.moveToTrash()}
				onArchiveOrRestore={() => void viewModel.archiveOrRestore()}
				task={viewModel.task}
			/>
		</div>
	)
}

function TaskDetailState({ message, onClose }: { message: string; onClose?: () => void }) {
	return (
		<div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-xs text-muted'>
			<p>{message}</p>
			{onClose ? (
				<Button onPress={onClose} size='sm' variant='outline'>
					关闭
				</Button>
			) : null}
		</div>
	)
}
