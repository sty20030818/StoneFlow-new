import type { ReactNode } from 'react'

import { ScrollShadow, Separator, Surface, ToggleButton, ToggleButtonGroup } from '@heroui/react'

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
	return <div className='flex h-full min-w-0 flex-1 flex-col'>{children}</div>
}

function PageFrameHeader({ breadcrumb, title, actions }: PageFrameHeaderProps) {
	return (
		<div className='shrink-0'>
			<header className='flex h-11 items-center justify-between gap-4 px-2'>
				<div className='min-w-0 flex-1'>
					{breadcrumb ?? (
						<h1 className='truncate text-sm font-semibold leading-5 text-foreground'>{title}</h1>
					)}
				</div>
				{actions ? <div className='flex shrink-0 items-center gap-1.5'>{actions}</div> : null}
			</header>
			<Separator variant='tertiary' />
		</div>
	)
}

function PageFrameToolbar({
	pills,
	filterAction,
	displayAction,
	filterBar,
}: PageFrameToolbarProps) {
	const hasActions = Boolean(pills?.length || filterAction || displayAction)
	const activePillIndex = pills?.findIndex((pill) => pill.active) ?? -1
	const selectedPillIndex = activePillIndex >= 0 ? activePillIndex : 0
	if (!hasActions && !filterBar) {
		return null
	}

	return (
		<Surface>
			<div className='flex flex-col gap-1.5 px-2 py-2'>
				{hasActions ? (
					<div className='flex items-center justify-between gap-3'>
						{pills?.length ? (
							<ToggleButtonGroup
								aria-label='页面筛选'
								className='min-w-0 flex-wrap'
								disallowEmptySelection
								isDetached
								selectedKeys={[selectedPillIndex]}
								selectionMode='single'
								size='sm'
							>
								{pills.map((pill, index) => (
									<ToggleButton
										data-page-toolbar-option='true'
										id={index}
										key={pill.label}
										onPress={pill.onPress}
										variant='ghost'
									>
										{pill.label}
									</ToggleButton>
								))}
							</ToggleButtonGroup>
						) : null}
						{filterAction || displayAction ? (
							<div className='flex shrink-0 items-center gap-1'>
								{filterAction}
								{displayAction}
							</div>
						) : null}
					</div>
				) : null}
				{filterBar ? <div className='min-w-0 empty:hidden'>{filterBar}</div> : null}
			</div>
		</Surface>
	)
}

function PageFrameBody({ children }: PageFrameBodyProps) {
	return (
		<ScrollShadow
			className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-2 py-2'
			data-scroll-container='true'
		>
			<div className='flex min-h-0 flex-1 flex-col'>{children}</div>
		</ScrollShadow>
	)
}

function PageFrameVirtualizedBody({ children }: PageFrameBodyProps) {
	return <AppScrollArea>{children}</AppScrollArea>
}

export const PageFrame = {
	Root: PageFrameRoot,
	Header: PageFrameHeader,
	Toolbar: PageFrameToolbar,
	Body: PageFrameBody,
	VirtualizedBody: PageFrameVirtualizedBody,
}
