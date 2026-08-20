import type { ReactNode } from 'react'

import { Button, ScrollShadow } from '@heroui/react'

import { AppScrollArea } from '@/shared/components/AppScrollArea'

type PageFrameHeaderProps = {
	breadcrumb?: ReactNode
	title?: string
	actions?: ReactNode
}

type PageFrameToolbarPill = {
	label: string
	active?: boolean
	onPress?: () => void
}

type PageFrameToolbarProps = {
	pills?: PageFrameToolbarPill[]
	filterAction?: ReactNode
	displayAction?: ReactNode
	/** 工具条下方筛选公式条（FilterBar） */
	filterBar?: ReactNode
}

type PageFrameBodyProps = {
	children: ReactNode
}

type PageFrameSlotProps = {
	children: ReactNode
}

/**
 * 工作区页面的纯布局框架。
 * 它只定义页面区域顺序，不能依赖或分发任何业务实体。
 */
function PageFrameRoot({ children }: PageFrameSlotProps) {
	return <div className='flex h-full min-w-0 flex-1 flex-col gap-2'>{children}</div>
}

function PageFrameHeader({ breadcrumb, title, actions }: PageFrameHeaderProps) {
	return (
		<header className='flex h-12 items-center justify-between gap-4 border-b border-separator pl-5 pr-2'>
			<div className='min-w-0 flex-1'>
				{breadcrumb ?? (
					<h1 className='truncate text-sm font-semibold leading-5 text-foreground'>{title}</h1>
				)}
			</div>
			{actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
		</header>
	)
}

function PageFrameToolbar({
	pills,
	filterAction,
	displayAction,
	filterBar,
}: PageFrameToolbarProps) {
	const hasActions = Boolean(pills?.length || filterAction || displayAction)
	if (!hasActions && !filterBar) {
		return null
	}

	return (
		<div className='flex flex-col gap-1.5 px-2'>
			{hasActions ? (
				<div className='flex min-h-8 items-center justify-between gap-3'>
					<div className='flex min-w-0 flex-wrap items-center gap-2'>
						{pills?.map((pill) => (
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
			) : null}
			{filterBar ? <div className='min-w-0'>{filterBar}</div> : null}
		</div>
	)
}

function PageFrameBody({ children }: PageFrameBodyProps) {
	return (
		<ScrollShadow
			className='flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2'
			data-scroll-container='true'
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>{children}</div>
		</ScrollShadow>
	)
}

function PageFrameVirtualizedBody({ children }: PageFrameBodyProps) {
	return (
		<AppScrollArea>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>{children}</div>
		</AppScrollArea>
	)
}

export const PageFrame = {
	Root: PageFrameRoot,
	Header: PageFrameHeader,
	Toolbar: PageFrameToolbar,
	Body: PageFrameBody,
	VirtualizedBody: PageFrameVirtualizedBody,
}
