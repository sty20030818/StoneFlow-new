import type { ReactNode } from 'react'

import { XIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import {
	TASK_BULK_ACTION_BAR_CLASS,
	TASK_BULK_ACTION_BUTTON_CLASS,
	TASK_BULK_ACTION_COUNT_PILL_CLASS,
} from '@/shared/ui/patterns/task-row'

type TaskBulkActionBarProps = {
	selectedCount: number
	onClear: () => void
	action: ReactNode
	className?: string
}

/**
 * 统一任务多选后的底部浮动操作条；页面只负责传入计数、清空动作和右侧操作内容。
 */
export function TaskBulkActionBar({
	selectedCount,
	onClear,
	action,
	className,
}: TaskBulkActionBarProps) {
	if (selectedCount < 1) {
		return null
	}

	return (
		<div
			className={cn(
				'pointer-events-none sticky bottom-4 z-20 mt-auto flex justify-center px-4 pt-4 pb-1',
				className,
			)}
		>
			<div
				aria-label='任务批量操作'
				className={TASK_BULK_ACTION_BAR_CLASS}
				role='toolbar'
			>
				<div className='inline-flex items-center gap-1.5'>
					<span className={TASK_BULK_ACTION_COUNT_PILL_CLASS}>
						已选 {selectedCount} 项
					</span>
					<Button
						aria-label='清空已选任务'
						className={TASK_BULK_ACTION_BUTTON_CLASS}
						onClick={onClear}
						size='icon-sm'
						type='button'
						variant='outline'
					>
						<XIcon />
					</Button>
				</div>

				<div aria-hidden className='mx-0.5 h-5 w-px shrink-0 bg-border' />

				<div className='flex items-center truncate'>{action}</div>
			</div>
		</div>
	)
}
