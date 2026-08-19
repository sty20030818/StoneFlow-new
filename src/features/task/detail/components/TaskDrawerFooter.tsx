import { Button } from '@heroui/react'
import { DetailFooter } from '@/shared/components/detail'
import { OverflowTooltip } from '@/shared/components/tooltip'
import type { TaskDetail } from '@/shared/types'
import { ArchiveIcon, Trash2Icon } from 'lucide-react'

// 模块级 Intl 格式化器：避免每次调用都重建，格式选项固定不变
const updatedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
	month: 'numeric',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
})

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
			<div className='min-w-0 flex-1 text-[11px] text-muted'>
				<OverflowTooltip content={`更新于 ${formatUpdatedAt(task.updatedAt)}`}>
					更新于 {formatUpdatedAt(task.updatedAt)}
				</OverflowTooltip>
			</div>
			<div className='flex min-w-0 shrink-0 items-center gap-2'>
				<Button
					className='h-7 px-2 text-xs'
					isDisabled={isArchiveBusy}
					onPress={onArchiveOrRestore}
					size='sm'
					variant='outline'
				>
					<ArchiveIcon className='size-3.5' />
					{task.archivedAt ? '恢复' : '归档'}
				</Button>
				<Button
					className='h-7 px-2 text-xs'
					isDisabled={isDeleteBusy}
					onPress={onMoveToTrash}
					size='sm'
					variant='danger'
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

	return updatedAtFormatter.format(date)
}
