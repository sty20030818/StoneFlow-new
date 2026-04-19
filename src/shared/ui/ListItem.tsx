import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type ListItemProps = {
	title: string
	description: string
	trailing?: ReactNode
	onClick?: () => void
	className?: string
}

export function ListItem({ title, description, trailing, onClick, className }: ListItemProps) {
	const classes = cn(
		'flex w-full items-start justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 text-left transition hover:border-border hover:bg-muted/35 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:outline-none',
		className,
	)

	if (onClick) {
		return (
			<button className={classes} onClick={onClick} type='button'>
				<div className='flex min-w-0 flex-1 flex-col gap-1'>
					<p className='truncate text-sm font-medium text-foreground'>{title}</p>
					<p className='text-xs leading-5 text-muted-foreground'>{description}</p>
				</div>
				{trailing ? <div className='flex shrink-0 items-center gap-2'>{trailing}</div> : null}
			</button>
		)
	}

	return (
		<div className={classes}>
			<div className='flex min-w-0 flex-1 flex-col gap-1'>
				<p className='truncate text-sm font-medium text-foreground'>{title}</p>
				<p className='text-xs leading-5 text-muted-foreground'>{description}</p>
			</div>
			{trailing ? <div className='flex shrink-0 items-center gap-2'>{trailing}</div> : null}
		</div>
	)
}
