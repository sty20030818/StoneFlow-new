import type { ComponentProps, ReactNode } from 'react'

import { Button, ScrollShadow } from '@heroui/react'

import { cn } from '@/shared/lib/utils'
import { ActionTooltip } from '@/shared/components/tooltip'

/**
 * MainCard 是页级骨架：Root / Header / Body 为正式必选结构。
 * 其余导出仅作为扩展插槽，不承载实体业务分叉。
 */
export type MainCardToolbarPill = {
	label: string
	active?: boolean
	onPress?: () => void
}

type MainCardRootProps = {
	children: ReactNode
	className?: string
}

type MainCardHeaderProps = {
	title?: string
	breadcrumb?: ReactNode
	action?: ReactNode
	className?: string
}

type MainCardToolbarProps = {
	pills?: MainCardToolbarPill[]
	left?: ReactNode
	filterAction?: ReactNode
	displayAction?: ReactNode
	className?: string
}

type MainCardShellSlotProps = {
	children: ReactNode
	className?: string
}

type MainCardGhostActionProps = Omit<
	ComponentProps<typeof Button>,
	'aria-label' | 'children' | 'isIconOnly' | 'size' | 'variant'
> & {
	'aria-label': string
	children: ReactNode
	tooltipShortcut?: ReactNode
}

function MainCardRoot({ children, className }: MainCardRootProps) {
	return (
		<div className={cn('flex h-full min-w-0 flex-1 flex-col gap-2', className)}>{children}</div>
	)
}

function MainCardHeader({ title, breadcrumb, action, className }: MainCardHeaderProps) {
	return (
		<header
			className={cn(
				'flex h-12 items-center justify-between gap-4 border-b border-separator pl-5 pr-2',
				className,
			)}
		>
			<div className='min-w-0 flex-1'>
				{breadcrumb ?? (
					<h1 className='truncate text-sm font-semibold leading-5 text-foreground'>{title}</h1>
				)}
			</div>
			{action ? <div className='flex shrink-0 items-center gap-2'>{action}</div> : null}
		</header>
	)
}

function MainCardToolbar({
	pills,
	left,
	filterAction,
	displayAction,
	className,
}: MainCardToolbarProps) {
	return (
		<div className={cn('flex min-h-8 items-center justify-between gap-3', className)}>
			<div className='flex min-w-0 flex-wrap items-center gap-2'>
				{left ??
					pills?.map((pill) => (
						<Button
							aria-pressed={!!pill.active}
							key={pill.label}
							onPress={pill.onPress}
							size='sm'
							type='button'
							variant={pill.active ? 'secondary' : 'outline'}
						>
							{pill.label}
						</Button>
					))}
			</div>

			{filterAction || displayAction ? (
				<div className='flex shrink-0 items-center gap-2'>
					{filterAction}
					{displayAction}
				</div>
			) : null}
		</div>
	)
}

function MainCardBody({ children, className }: MainCardShellSlotProps) {
	return (
		<ScrollShadow
			className={cn(
				'flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2',
				className,
			)}
			data-scroll-container='true'
			data-scroll-container-role='main-card'
			hideScrollBar
		>
			{children}
		</ScrollShadow>
	)
}

function MainCardGhostAction({
	children,
	className,
	isDisabled,
	'aria-label': ariaLabel,
	tooltipShortcut,
	...props
}: MainCardGhostActionProps) {
	const action = (
		<Button
			aria-label={ariaLabel}
			className={className}
			isDisabled={isDisabled}
			isIconOnly
			size='sm'
			type='button'
			variant='ghost'
			{...props}
		>
			{children}
		</Button>
	)

	if (isDisabled) return action

	return (
		<ActionTooltip label={ariaLabel} shortcut={tooltipShortcut}>
			{action}
		</ActionTooltip>
	)
}

export const MainCard = {
	Root: MainCardRoot,
	Header: MainCardHeader,
	Toolbar: MainCardToolbar,
	Body: MainCardBody,
	GhostAction: MainCardGhostAction,
}

export { MainCardBody, MainCardGhostAction, MainCardHeader, MainCardRoot, MainCardToolbar }
