import { Button } from '@/shared/ui/base/button'
import { DetailFooter } from '@/shared/ui/detail'
import type { TaskDetail } from '@/shared/types'
import { ArchiveIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'

type TaskDrawerFooterProps = {
	task: TaskDetail
	isArchiveBusy: boolean
	isDeleteBusy: boolean
	onArchiveOrRestore: () => void
	onMoveToTrash: () => void
}

export function TaskDrawerFooter({
	task,
	isArchiveBusy,
	isDeleteBusy,
	onArchiveOrRestore,
	onMoveToTrash,
}: TaskDrawerFooterProps) {
	return (
		<DetailFooter className='items-center gap-2 py-2 pl-4 pr-2'>
			<div className='min-w-0 flex-1 text-[11px] text-sf-text-tertiary'>
				<span className='truncate'>更新于 {formatUpdatedAt(task.updatedAt)}</span>
			</div>
			<div className='flex min-w-0 shrink-0 items-center gap-2'>
				<Button
					aria-label='更多任务操作'
					className='size-7 p-0'
					size='icon'
					type='button'
					variant='outline'
				>
					<MoreHorizontalIcon className='size-4' />
				</Button>
				<Button
					className='h-7 px-2 text-[12px]'
					disabled={isArchiveBusy}
					onClick={onArchiveOrRestore}
					size='sm'
					variant='outline'
				>
					<ArchiveIcon className='size-3.5' />
					{task.archivedAt ? '恢复' : '归档'}
				</Button>
				<Button
					className='h-7 px-2 text-[12px]'
					disabled={isDeleteBusy}
					onClick={onMoveToTrash}
					size='sm'
					variant='destructive'
				>
					<Trash2Icon className='size-3.5' />
					移入回收站
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
