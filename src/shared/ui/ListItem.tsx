import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { LINEAR_CARD_BASE_CLASS, LINEAR_CARD_IDLE_CLASS } from '@/shared/ui/linearSurface'

type ListItemProps = {
	title: string
	description: string
	trailing?: ReactNode
	onClick?: () => void
	className?: string
	taskId?: string
}

export function ListItem({
	title,
	description,
	trailing,
	onClick,
	className,
	taskId,
}: ListItemProps) {
	const classes = cn(
		LINEAR_CARD_BASE_CLASS,
		LINEAR_CARD_IDLE_CLASS,
		'group w-full px-4 py-3 text-left focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/18 focus-visible:outline-none',
		className,
	)

	if (onClick) {
		return (
			<button
				className={classes}
				data-shell-task-card={taskId ? 'true' : undefined}
				data-task-id={taskId}
				onClick={onClick}
				type='button'
			>
				<div className='flex min-w-0 flex-1 flex-col gap-1'>
					<p className='truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary'>
						{title}
					</p>
					<p className='text-xs leading-5 text-muted-foreground'>{description}</p>
				</div>
				{trailing ? <div className='flex shrink-0 items-center gap-2'>{trailing}</div> : null}
			</button>
		)
	}

	return (
		<div className={classes}>
			<div className='flex min-w-0 flex-1 flex-col gap-1'>
				<p className='truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary'>
					{title}
				</p>
				<p className='text-xs leading-5 text-muted-foreground'>{description}</p>
			</div>
			{trailing ? <div className='flex shrink-0 items-center gap-2'>{trailing}</div> : null}
		</div>
	)
}
