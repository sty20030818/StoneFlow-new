import type { ComponentProps, ComponentType, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import {
	mainCardGhostActionClass,
	mainCardSectionClass,
	mainCardToolbarPillVariants,
} from '@/shared/ui/patterns/main-card'
import {
	ListFilterIcon,
	PanelRightOpenIcon,
	RefreshCwIcon,
	SlidersHorizontalIcon,
} from 'lucide-react'

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
	onRefresh?: () => void
	refreshDisabled?: boolean
	className?: string
}

type MainCardShellSlotProps = {
	children: ReactNode
	className?: string
}

type MainCardIconAction = {
	label: string
	icon: ComponentType
	onClick?: () => void
	disabled?: boolean
}

function MainCardRoot({ children, className }: MainCardRootProps) {
	return <div className={cn('flex min-h-full min-w-0 flex-1 flex-col', className)}>{children}</div>
}

function MainCardHeader({ title, breadcrumb, action, className }: MainCardHeaderProps) {
	return (
		<header
			className={cn(
				'flex h-12 items-center justify-between gap-4 border-b border-sf-border-subtle px-6',
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
	onRefresh,
	refreshDisabled,
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
							variant={pill.active ? 'secondary' : 'ghost'}
						>
							{pill.label}
						</Button>
					))}
			</div>

			<div className='flex shrink-0 items-center gap-2'>
				{filterAction ?? (
					<MainCardToolbarIconButton
						action={{ label: '筛选', icon: ListFilterIcon, onClick: () => undefined }}
					/>
				)}
				{createToolbarActions(onRefresh, refreshDisabled).map((action) => (
					<MainCardToolbarIconButton action={action} key={action.label} />
				))}
			</div>
		</div>
	)
}

function MainCardBody({ children, className }: MainCardShellSlotProps) {
	return (
		<div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2', className)}>
			{children}
		</div>
	)
}

function MainCardFooter({ children, className }: MainCardShellSlotProps) {
	return <div className={cn('mt-auto flex flex-col gap-3', className)}>{children}</div>
}

function MainCardNoticeGroup({ children, className }: MainCardShellSlotProps) {
	return <div className={cn('flex flex-col gap-3', className)}>{children}</div>
}

function MainCardSection({ children, className }: MainCardShellSlotProps) {
	return (
		<section
			className={cn(
				mainCardSectionClass,
				className,
			)}
		>
			{children}
		</section>
	)
}

function MainCardEmpty({ children, className }: MainCardShellSlotProps) {
	return <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</div>
}

function MainCardGhostAction({ children, className, ...props }: ComponentProps<typeof Button>) {
	return (
		<Button
			className={cn(mainCardGhostActionClass, className)}
			size='icon-sm'
			type='button'
			variant='ghost'
			{...props}
		>
			{children}
		</Button>
	)
}

function MainCardToolbarIconButton({ action }: { action: MainCardIconAction }) {
	const Icon = action.icon

	return (
		<Button
			aria-label={action.label}
			disabled={action.disabled}
			onClick={action.onClick}
			size='icon-sm'
			type='button'
			variant='outline'
		>
			<Icon />
		</Button>
	)
}

function createToolbarActions(
	onRefresh: (() => void) | undefined,
	refreshDisabled: boolean | undefined,
): MainCardIconAction[] {
	const noop = () => undefined

	return [
		{ label: '视图选项', icon: SlidersHorizontalIcon, onClick: noop },
		{ label: '打开右侧面板', icon: PanelRightOpenIcon, onClick: noop },
		{
			label: '刷新',
			icon: RefreshCwIcon,
			onClick: onRefresh,
			disabled: refreshDisabled,
		},
	]
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
