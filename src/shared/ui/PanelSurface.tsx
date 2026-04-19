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
				'rounded-2xl border border-border/75 bg-card px-5 py-5 shadow-(--sf-shadow-panel)',
				className,
			)}
			{...props}
		>
			{eyebrow || title || description || actions ? (
				<header className='mb-4 flex flex-wrap items-start justify-between gap-3'>
					<div className='space-y-1'>
						{eyebrow ? (
							<p className='text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase'>
								{eyebrow}
							</p>
						) : null}
						{title ? (
							<h2 className='text-lg font-semibold tracking-[-0.02em] text-foreground'>{title}</h2>
						) : null}
						{description ? (
							<p className='max-w-2xl text-sm leading-6 text-muted-foreground'>{description}</p>
						) : null}
					</div>
					{actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
				</header>
			) : null}
			{children}
		</section>
	)
}
