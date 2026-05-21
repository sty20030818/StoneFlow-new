import type { AutosaveController } from '@/shared/autosave'
import { Button } from '@/shared/ui/base/button'
import { DetailFooter, DetailSaveStatus } from '@/shared/ui/detail'
import type { TaskDetail } from '@/shared/types'
import { MoreHorizontalIcon } from 'lucide-react'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskDrawerFooterProps = {
	autosave: AutosaveController<TaskDetailDraft>
	task: TaskDetail
	isArchiveBusy: boolean
	onArchiveOrRestore: () => void
}

export function TaskDrawerFooter({
	autosave,
	task,
	isArchiveBusy,
	onArchiveOrRestore,
}: TaskDrawerFooterProps) {
	return (
		<DetailFooter className='items-center gap-2'>
			<div className='min-w-0 flex-1 text-[11px] text-sf-text-tertiary'>
				<span className='truncate'>更新于 {formatUpdatedAt(task.updatedAt)}</span>
			</div>
			<div className='flex min-w-0 shrink-0 items-center gap-2'>
				<DetailSaveStatus error={autosave.error} savedAt={autosave.savedAt} status={autosave.status} />
				{autosave.status === 'failed' ? (
					<Button className='h-7 px-2 text-[12px]' onClick={() => void autosave.retry()} size='sm' variant='outline'>
						重试
					</Button>
				) : null}
				<Button aria-label='更多任务操作' className='size-7 p-0' size='icon' type='button' variant='outline'>
					<MoreHorizontalIcon className='size-4' />
				</Button>
				<Button
					className='h-7 px-2 text-[12px]'
					disabled={isArchiveBusy}
					onClick={onArchiveOrRestore}
					size='sm'
					variant='outline'
				>
					{task.archivedAt ? '恢复' : '归档'}
				</Button>
			</div>
		</DetailFooter>
	)
}

function formatUpdatedAt(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	}).format(date)
}
