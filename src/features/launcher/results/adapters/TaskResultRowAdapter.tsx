import { Button } from '@heroui/react'
import type { KeyboardEventHandler, Ref } from 'react'

import { PriorityIcon } from '@/features/task'
import { TaskStatusIndicator } from '@/features/task'
import type { LauncherTaskItem } from '../../model/types'
import { OverflowTooltip } from '@/shared/components/tooltip'

type TaskResultRowAdapterProps = {
	item: LauncherTaskItem
	isActive: boolean
	onOpen: (item: LauncherTaskItem) => void
	onFocus: () => void
	onKeyDown: KeyboardEventHandler<HTMLButtonElement>
	rowRef: Ref<HTMLButtonElement>
}

export function TaskResultRowAdapter({
	item,
	isActive,
	onOpen,
	onFocus,
	onKeyDown,
	rowRef,
}: TaskResultRowAdapterProps) {
	const subtitle = getTaskSubtitle(item)

	return (
		<div role='listitem'>
			<Button
				aria-current={isActive ? 'true' : undefined}
				aria-label={`打开任务 ${item.title}`}
				className='min-h-11'
				data-content-height='true'
				fullWidth
				onFocus={onFocus}
				onHoverStart={onFocus}
				onKeyDown={onKeyDown}
				onPress={() => onOpen(item)}
				ref={rowRef}
				type='button'
				variant='ghost'
			>
				<div className='flex w-full min-w-0 items-center gap-2.5 text-left'>
					<div className='flex min-w-0 flex-1 items-center gap-2.5'>
						<div className='flex shrink-0 items-center gap-1.5'>
							<TaskStatusIndicator status={item.status} />
							<PriorityIcon priority={item.priority} size='sm' />
						</div>

						<div className='min-w-0 flex-1'>
							<OverflowTooltip className='text-[12.5px] text-foreground' content={item.title}>
								{item.title}
							</OverflowTooltip>
							<OverflowTooltip className='mt-0.5 text-[11px] text-muted' content={subtitle}>
								{subtitle}
							</OverflowTooltip>
						</div>
					</div>
				</div>
			</Button>
		</div>
	)
}

function getTaskSubtitle(item: LauncherTaskItem) {
	if (item.projectName) {
		return `${item.spaceName} / ${item.projectName}`
	}

	return `${item.spaceName} / ${item.projectName ?? '独立事项'}`
}
