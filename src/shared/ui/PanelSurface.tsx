import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type PanelSurfaceProps = ComponentPropsWithoutRef<'section'> & {
	eyebrow?: string
	title?: string
	description?: string
	actions?: ReactNode
}

export function PanelSurface({
	className,
	eyebrow,
	title,
	description,
	actions,
	children,
	...props
}: PanelSurfaceProps) {
	return (
		<section
			className={cn(
				'rounded-lg border border-border bg-card px-5 py-5 shadow-(--sf-shadow-panel)',
				className,
			)}
			{...props}
		>
			{eyebrow || title || description || actions ? (
				<header className='mb-5 flex flex-wrap items-start justify-between gap-4'>
					<div className='min-w-0 space-y-1.5'>
						{eyebrow ? (
							<p className='text-[10.5px] font-medium tracking-[0.16em] text-muted-foreground uppercase'>
								{eyebrow}
							</p>
						) : null}
						{title ? (
							<h2 className='text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground'>
								{title}
							</h2>
						) : null}
						{description ? (
							<p className='max-w-2xl text-sm leading-6 text-muted-foreground'>{description}</p>
						) : null}
					</div>
					{actions ? (
						<div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>
					) : null}
				</header>
			) : null}
			{children}
		</section>
	)
}
