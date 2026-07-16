import type { ReactNode } from 'react'

import { XIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'
import {
	BULK_ACTION_BAR_CLASS,
	BULK_ACTION_BUTTON_CLASS,
	BULK_ACTION_COUNT_PILL_CLASS,
} from '@/shared/components/patterns/bulk-action'

export type BulkActionBarProps = {
	selectedCount: number
	onClear: () => void
	action: ReactNode
	className?: string
}

/**
 * 统一多选后的底部浮动操作条；页面只负责传入计数、清空动作和右侧操作内容。
 *
 * 使用 `absolute` 定位悬浮在当前 scene 底部，不随 board 内容滚动消失。
 */
export function BulkActionBar({ selectedCount, onClear, action, className }: BulkActionBarProps) {
	if (selectedCount < 1) {
		return null
	}

	return (
		<div
			className={cn(
				'pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4',
				className,
			)}
		>
			<div aria-label='批量操作' className={BULK_ACTION_BAR_CLASS} role='toolbar'>
				<div className='inline-flex items-center gap-1.5'>
					<span className={BULK_ACTION_COUNT_PILL_CLASS}>已选 {selectedCount} 项</span>
					<Button
						aria-label='清空已选'
						className={BULK_ACTION_BUTTON_CLASS}
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
