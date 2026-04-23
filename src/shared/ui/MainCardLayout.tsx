import type { ComponentProps, ComponentType, ReactNode } from 'react'

import { Button } from '@/shared/ui/base/button'
import { cn } from '@/shared/lib/utils'
import {
	ListFilterIcon,
	PanelRightOpenIcon,
	RefreshCwIcon,
	SlidersHorizontalIcon,
} from 'lucide-react'

type MainCardLayoutProps = {
	header: ReactNode
	toolbar: ReactNode
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

type MainCardToolbarPill = {
	label: string
	active?: boolean
	onClick?: () => void
	role?: 'tab'
}

type MainCardIconAction = {
	label: string
	icon: ComponentType
	onClick?: () => void
	disabled?: boolean
}

const MAIN_CARD_GHOST_ACTION_CLASS =
	'border-transparent bg-[#ffffff] text-[#5d5d5f] shadow-none hover:bg-[#f3f3f4] hover:text-[#5d5d5f] hover:font-semibold'

export function MainCardLayout({ header, toolbar, children, className }: MainCardLayoutProps) {
	return (
		<div className={cn('flex min-h-full min-w-0 flex-col', className)}>
			{header}
			{toolbar}
			<MainCardBody>{children}</MainCardBody>
		</div>
	)
}

export function MainCardHeader({ title, breadcrumb, action, className }: MainCardHeaderProps) {
	return (
		<header
			className={cn(
				'flex h-12 items-center justify-between gap-4 border-b border-(--sf-color-border-subtle) px-6',
				className,
			)}
		>
			<div className='min-w-0 flex-1'>
				{breadcrumb ?? (
					<h1 className='truncate text-[1.0625rem] leading-6 font-semibold text-foreground'>
						{title}
					</h1>
				)}
			</div>
			{action ? <div className='flex shrink-0 items-center gap-2'>{action}</div> : null}
		</header>
	)
}

export function MainCardToolbar({
	pills,
	left,
	filterAction,
	onRefresh,
	refreshDisabled,
	className,
}: MainCardToolbarProps) {
	const pillRole = pills?.some((pill) => pill.role === 'tab') ? 'tablist' : undefined

	return (
		<div
			className={cn('flex min-h-13.5 items-center justify-between gap-3 px-4 py-2.5', className)}
		>
			<div className='flex min-w-0 flex-wrap items-center gap-2' role={pillRole}>
				{left ??
					pills?.map((pill) => (
						<Button
							aria-pressed={pill.role === 'tab' ? undefined : pill.active ? true : undefined}
							aria-selected={pill.role === 'tab' ? !!pill.active : undefined}
							className={cn(
								'h-7.5 rounded-full px-3',
								pill.active
									? 'border-(--sf-color-border-subtle) bg-(--sf-color-bg-surface-hover) text-foreground'
									: 'bg-transparent text-(--sf-color-text-secondary) shadow-none',
							)}
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

export function MainCardBody({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('flex min-w-0 flex-1 flex-col px-6 pb-6', className)}>{children}</div>
}

export function MainCardGhostAction({
	children,
	className,
	...props
}: ComponentProps<typeof Button>) {
	return (
		<Button
			className={cn(MAIN_CARD_GHOST_ACTION_CLASS, className)}
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
