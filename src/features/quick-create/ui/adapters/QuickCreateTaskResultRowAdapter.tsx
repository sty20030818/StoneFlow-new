import { FolderIcon } from 'lucide-react'

import { PriorityIcon } from '@/features/task'
import { TaskStatusIndicator } from '@/features/task'
import type { QuickCreateTaskItem } from '@/features/quick-create/model/types'
import { RowShell } from '@/shared/components/row'
import { cn } from '@/shared/lib/utils'

type QuickCreateTaskResultRowAdapterProps = {
	item: QuickCreateTaskItem
	index: number
	isActive: boolean
	onOpen: (item: QuickCreateTaskItem) => void
	onHover: (index: number) => void
}

export function QuickCreateTaskResultRowAdapter({
	item,
	index,
	isActive,
	onOpen,
	onHover,
}: QuickCreateTaskResultRowAdapterProps) {
	return (
		<RowShell.Root
			active={isActive}
			aria-label={`打开任务 ${item.title}`}
			interactive
			onClick={() => onOpen(item)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					onOpen(item)
				}
			}}
			onMouseEnter={() => onHover(index)}
		>
			<RowShell.Left>
				<RowShell.Leading className='gap-1.5'>
					<TaskStatusIndicator status={item.status} />
					<PriorityIcon priority={item.priority} size='sm' />
				</RowShell.Leading>

				<RowShell.Title>
					<div className='min-w-0'>
						<div className='truncate text-[12.5px] text-foreground'>{item.title}</div>
						<div className='mt-0.5 truncate text-[11px] text-sf-text-quaternary'>
							{getTaskSubtitle(item)}
						</div>
					</div>
				</RowShell.Title>
			</RowShell.Left>

			<RowShell.Right>
				<RowShell.Actions className='gap-1.5'>
					<span className='flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
						<FolderIcon className='size-3.5' />
					</span>
					<span
						className={cn(
							'rounded border border-sf-border-subtle px-1.5 py-0.5 text-[10.5px] text-sf-text-quaternary',
						)}
					>
						任务
					</span>
				</RowShell.Actions>
			</RowShell.Right>
		</RowShell.Root>
	)
}

function getTaskSubtitle(item: QuickCreateTaskItem) {
	if (item.projectName) {
		return `${item.spaceName} / ${item.projectName}`
	}

	return `${item.spaceName} / ${item.inboxAt ? '收件箱' : '独立事项'}`
}
