import type { ComponentProps, ReactNode } from 'react'

import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { cn } from '@/shared/lib/utils'

type PageFrameHeaderProps = {
	breadcrumb: ReactNode
	actions?: ReactNode
	className?: string
}

type PageFrameToolbarProps = {
	pills?: ComponentProps<typeof MainCard.Toolbar>['pills']
	left?: ReactNode
	filterAction?: ReactNode
	displayAction?: ReactNode
	/** 工具条下方筛选公式条（FilterBar） */
	filterBar?: ReactNode
}

type PageFrameBodyProps = {
	children: ReactNode
	className?: string
}

type PageFrameSlotProps = {
	children: ReactNode
	className?: string
}

/**
 * 工作区页面的纯布局框架。
 * 它只定义页面区域顺序，不能依赖或分发任何业务实体。
 */
function PageFrameRoot({ children }: PageFrameSlotProps) {
	return <MainCard.Root>{children}</MainCard.Root>
}

function PageFrameHeader({ breadcrumb, actions, className }: PageFrameHeaderProps) {
	return <MainCard.Header action={actions} breadcrumb={breadcrumb} className={className} />
}

function PageFrameToolbar({
	pills,
	left,
	filterAction,
	displayAction,
	filterBar,
}: PageFrameToolbarProps) {
	if (!pills && !left && !filterAction && !displayAction && !filterBar) {
		return null
	}

	return (
		<div className='flex flex-col gap-1.5 px-2'>
			{pills || left || filterAction || displayAction ? (
				<MainCard.Toolbar
					displayAction={displayAction}
					filterAction={filterAction}
					left={left}
					pills={pills}
				/>
			) : null}
			{filterBar ? <div className='min-w-0'>{filterBar}</div> : null}
		</div>
	)
}

function PageFrameBody({ children, className }: PageFrameBodyProps) {
	return (
		<MainCard.Body>
			<div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>{children}</div>
		</MainCard.Body>
	)
}

function PageFrameBulkBar({ children }: Pick<PageFrameSlotProps, 'children'>) {
	return <>{children}</>
}

export const PageFrame = {
	Root: PageFrameRoot,
	Header: PageFrameHeader,
	Toolbar: PageFrameToolbar,
	Body: PageFrameBody,
	BulkBar: PageFrameBulkBar,
}
