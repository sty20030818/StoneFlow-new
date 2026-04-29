import type { ReactNode } from 'react'

import { XIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'

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
				className='pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-(--sf-color-border) bg-(--sf-color-bg-elevated) p-1.5 text-(--sf-color-sidebar-action-foreground) shadow-(--sf-shadow-popover) transition-colors hover:border-(--sf-color-border-strong)'
				role='toolbar'
			>
				<div className='inline-flex items-center gap-1.5'>
					<span className='inline-flex h-7.5 items-center rounded-full border border-(--sf-color-border) bg-white px-3 text-[0.8rem] font-medium text-(--sf-color-sidebar-action-foreground) shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] transition-colors hover:border-(--sf-color-border-strong)'>
						已选 {selectedCount} 项
					</span>
					<Button
						aria-label='清空已选任务'
						className='border-(--sf-color-border) bg-white text-(--sf-color-sidebar-action-foreground) hover:border-(--sf-color-border-strong) hover:bg-(--sf-color-bg-surface-muted) hover:text-(--sf-color-sidebar-action-foreground)'
						onClick={onClear}
						size='icon-sm'
						type='button'
						variant='outline'
					>
						<XIcon />
					</Button>
				</div>

				<div aria-hidden className='mx-0.5 h-5 w-px shrink-0 bg-(--sf-color-border)' />

				<div className='flex items-center truncate'>{action}</div>
			</div>
		</div>
	)
}
