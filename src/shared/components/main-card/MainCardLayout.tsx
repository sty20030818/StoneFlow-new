import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import { Button } from '@/shared/components/base/button'
import {
	mainCardInlineActionsClass,
	mainCardSectionClass,
	mainCardToolbarPillVariants,
} from '@/shared/components/patterns/main-card'

/**
 * MainCard 是页级骨架：Root / Header / Body 为正式必选结构。
 * 其余导出仅作为扩展插槽，不承载实体业务分叉。
 */
export type MainCardToolbarPill = {
	label: string
	active?: boolean
	onClick?: () => void
	role?: 'tab'
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

function MainCardRoot({ children, className }: MainCardRootProps) {
	return (
		<div className={cn('flex h-full min-w-0 flex-1 flex-col gap-2', className)}>{children}</div>
	)
}

function MainCardHeader({ title, breadcrumb, action, className }: MainCardHeaderProps) {
	return (
		<header
			className={cn(
				'flex h-12 items-center justify-between gap-4 border-b border-sf-border-subtle pl-6 pr-2',
				className,
			)}
		>
			<div className='min-w-0 flex-1'>
				{breadcrumb ?? (
					<h1 className='truncate text-sm font-semibold leading-5 text-foreground'>{title}</h1>
				)}
			</div>
			{action ? <div className={mainCardInlineActionsClass}>{action}</div> : null}
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
	const pillRole = pills?.some((pill) => pill.role === 'tab') ? 'tablist' : undefined

	return (
		<div className={cn('flex min-h-8 items-center justify-between gap-3', className)}>
			<div className='flex min-w-0 flex-wrap items-center gap-2' role={pillRole}>
				{left ??
					pills?.map((pill) => (
						<Button
							aria-pressed={pill.role === 'tab' ? undefined : pill.active ? true : undefined}
							aria-selected={pill.role === 'tab' ? !!pill.active : undefined}
							className={mainCardToolbarPillVariants({
								state: pill.active ? 'active' : 'inactive',
							})}
							key={pill.label}
							onClick={pill.onClick}
							role={pill.role}
							size='sm'
							type='button'
							variant='outline'
						>
							{pill.label}
						</Button>
					))}
			</div>

			{filterAction || displayAction ? (
				<div className={mainCardInlineActionsClass}>
					{filterAction}
					{displayAction}
				</div>
			) : null}
		</div>
	)
}

function MainCardBody({ children, className }: MainCardShellSlotProps) {
	return (
		<AppScrollArea
			className='min-w-0 flex-1'
			scrollContainerRole='main-card'
			viewportClassName={cn('flex min-h-0 min-w-0 flex-col gap-2 px-2 pb-2', className)}
		>
			{children}
		</AppScrollArea>
	)
}

function MainCardFooter({ children, className }: MainCardShellSlotProps) {
	return <div className={cn('mt-auto flex flex-col gap-3', className)}>{children}</div>
}

function MainCardNoticeGroup({ children, className }: MainCardShellSlotProps) {
	return <div className={cn('flex flex-col gap-3', className)}>{children}</div>
}

function MainCardSection({ children, className }: MainCardShellSlotProps) {
	return <section className={cn(mainCardSectionClass, className)}>{children}</section>
}

function MainCardEmpty({ children, className }: MainCardShellSlotProps) {
	return <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</div>
}

function MainCardGhostAction({ children, className, ...props }: ComponentProps<typeof Button>) {
	return (
		<Button className={className} size='icon-sm' type='button' variant='ghost' {...props}>
			{children}
		</Button>
	)
}

export const MainCard = {
	Root: MainCardRoot,
	Header: MainCardHeader,
	Toolbar: MainCardToolbar,
	Body: MainCardBody,
	Footer: MainCardFooter,
	NoticeGroup: MainCardNoticeGroup,
	Section: MainCardSection,
	Empty: MainCardEmpty,
	GhostAction: MainCardGhostAction,
}

export {
	MainCardBody,
	MainCardEmpty,
	MainCardFooter,
	MainCardGhostAction,
	MainCardHeader,
	MainCardNoticeGroup,
	MainCardRoot,
	MainCardSection,
	MainCardToolbar,
}
