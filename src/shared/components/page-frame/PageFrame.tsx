import { useState, type ReactNode } from 'react'

import { ScrollShadow, Separator, Surface, ToggleButton, ToggleButtonGroup } from '@heroui/react'

import { AppScrollArea } from '@/shared/components/AppScrollArea'

type PageFrameHeaderProps = {
	breadcrumb?: ReactNode
	title?: string
	actions?: ReactNode
}

type PageFrameToolbarPill = {
	key: string
	label: string
}

type PageFrameToolbarProps = {
	pills?: PageFrameToolbarPill[]
	selectedKey?: string
	onSelectionChange?: (key: string) => void | Promise<unknown>
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
			<header className='flex h-11 items-center justify-between gap-3 px-2'>
				<div className='min-w-0 flex-1'>
					{breadcrumb ?? (
						<h1 className='truncate text-sm font-semibold leading-5 text-foreground'>{title}</h1>
					)}
				</div>
				{actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
			</header>
			<Separator variant='tertiary' />
		</div>
	)
}

function PageFrameToolbar({
	pills,
	selectedKey,
	onSelectionChange,
	filterAction,
	displayAction,
	filterBar,
}: PageFrameToolbarProps) {
	const hasActions = Boolean(pills?.length || filterAction || displayAction)
	const canonicalSelectedKey = selectedKey ?? pills?.[0]?.key ?? null
	if (!hasActions && !filterBar) {
		return null
	}

	return (
		<Surface>
			<div className='flex flex-col gap-2 px-2 py-2'>
				{hasActions ? (
					<div className='flex items-center justify-between gap-3'>
						{pills?.length ? (
							<PageFrameToolbarChoices
								onSelectionChange={onSelectionChange}
								pills={pills}
								selectedKey={canonicalSelectedKey}
							/>
						) : null}
						{filterAction || displayAction ? (
							<div className='flex shrink-0 items-center gap-2'>
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

function PageFrameToolbarChoices({
	pills,
	selectedKey,
	onSelectionChange,
}: {
	pills: PageFrameToolbarPill[]
	selectedKey: string | null
	onSelectionChange?: (key: string) => void | Promise<unknown>
}) {
	const [pendingSelection, setPendingSelection] = useState<{
		canonicalKey: string | null
		key: string
	} | null>(null)
	if (pendingSelection && pendingSelection.canonicalKey !== selectedKey) {
		setPendingSelection(null)
	}
	const optimisticKey =
		pendingSelection?.canonicalKey === selectedKey ? pendingSelection.key : selectedKey

	return (
		<ToggleButtonGroup
			aria-label='页面筛选'
			className='min-w-0 flex-wrap'
			disallowEmptySelection
			isDetached
			onSelectionChange={(keys) => {
				const nextKey = keys.values().next().value
				if (typeof nextKey !== 'string' || nextKey === optimisticKey) return
				const pending = { canonicalKey: selectedKey, key: nextKey }
				setPendingSelection(pending)
				const finish = () => {
					setPendingSelection((current) => (current === pending ? null : current))
				}
				void Promise.resolve(onSelectionChange?.(nextKey)).then(finish, finish)
			}}
			selectedKeys={optimisticKey ? [optimisticKey] : []}
			selectionMode='single'
			size='sm'
		>
			{pills.map((pill) => (
				<ToggleButton id={pill.key} key={pill.key} variant='ghost'>
					{pill.label}
				</ToggleButton>
			))}
		</ToggleButtonGroup>
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
