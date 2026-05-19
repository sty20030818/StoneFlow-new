import {
	Children,
	cloneElement,
	Fragment,
	isValidElement,
	type ComponentProps,
	type ReactElement,
	type ReactNode,
} from 'react'

import { ContextMenu, ContextMenuTrigger } from '@/shared/ui/base/context-menu'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import {
	entityBoardCompactBadgeClass,
	entityBoardLoadingCardClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionHeadingClass,
	entityBoardSectionRightSpacerClass,
	entityBoardSectionToggleClass,
} from '@/shared/ui/patterns/entity-board'
import {
	ROW_SHELL_SECTION_HEADER_CLASS,
	type RowSelectionGroupPosition,
} from '@/shared/ui/patterns/row-tokens'
import { TriangleIcon } from 'lucide-react'

export type BoardSection<T> = {
	key: string
	label: string
	items: T[]
}

export type BoardGroupHeaderProps = {
	title: ReactNode
	count?: number
	leading?: ReactNode
	trailing?: ReactNode
	className?: string
	titleClassName?: string
}

export type BoardRowsProps = ComponentProps<'div'> & {
	selectedIdSet?: Set<string>
	getItemId?: (child: ReactNode, index: number) => string | undefined
}

export const BOARD_STACK_CLASS = 'flex min-h-0 flex-1 flex-col gap-0.5'
export const BOARD_GROUP_CLASS = 'flex flex-col gap-0.5 last:pb-2'
export const BOARD_ROWS_CLASS = 'flex flex-col gap-0.5'
export const BOARD_COLLAPSIBLE_CLASS =
	'flex flex-col gap-0.5 last:pb-2 [&[data-state=open]_[data-chevron]]:rotate-90'
/**
 * 分组 header 保持原来的 sticky 几何关系。
 * row 的遮挡由 board 顶部独立 mask 负责，避免把补底区域绑定到某个 header 上。
 */
export const BOARD_GROUP_HEADER_CLASS = `sticky top-0 z-10 ${ROW_SHELL_SECTION_HEADER_CLASS}`

/**
 * 页级 board 主容器，只负责纵向堆叠分组。
 */
export function BoardRoot({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div className='relative isolate flex min-h-0 flex-1 flex-col'>
			<div {...props} className={cn(BOARD_STACK_CLASS, className)} data-board-root='true'>
				{children}
			</div>
		</div>
	)
}

/**
 * 单个分组容器，承载 header 和 rows。
 */
export function BoardGroup({ children, className, ...props }: ComponentProps<'section'>) {
	return (
		<section {...props} className={cn(BOARD_GROUP_CLASS, className)} data-board-section='true'>
			{children}
		</section>
	)
}

export function BoardGroupHeader({
	title,
	count,
	leading,
	trailing,
	className,
	titleClassName,
}: BoardGroupHeaderProps) {
	return (
		<div
			className={cn('flex items-center justify-between gap-3 px-1', className)}
			data-board-section-header='true'
		>
			<div className='flex min-w-0 items-center gap-2'>
				{leading}
				<span className={cn('truncate text-sm font-semibold text-foreground', titleClassName)}>
					{title}
				</span>
				{typeof count === 'number' ? (
					<Badge
						className={cn(entityBoardSectionCountBadgeClass, entityBoardCompactBadgeClass)}
						variant='secondary'
					>
						{count}
					</Badge>
				) : null}
			</div>
			{trailing}
		</div>
	)
}

export function BoardRows({
	children,
	className,
	selectedIdSet,
	getItemId,
	...props
}: BoardRowsProps) {
	if (!selectedIdSet || !getItemId) {
		return (
			<div {...props} className={cn(BOARD_ROWS_CLASS, className)} data-board-rows='true'>
				{children}
			</div>
		)
	}

	const childArray = Children.toArray(children)
	const groups: Array<{
		selected: boolean
		items: Array<{ child: ReactNode; id?: string; index: number }>
	}> = []

	for (let i = 0; i < childArray.length; i++) {
		const child = childArray[i]
		const id = getItemId(child, i)
		const isSelected = !!id && selectedIdSet.has(id)
		const lastGroup = groups[groups.length - 1]
		const groupItem = { child, id, index: i }

		if (lastGroup && lastGroup.selected === isSelected) {
			lastGroup.items.push(groupItem)
		} else {
			groups.push({ selected: isSelected, items: [groupItem] })
		}
	}

	return (
		<div {...props} className={cn(BOARD_ROWS_CLASS, className)} data-board-rows='true'>
			{groups.map((group, gi) => {
				if (!group.selected) {
					return group.items.map((item, ii) => {
						return <Fragment key={item.id ?? gi * 100 + ii}>{item.child}</Fragment>
					})
				}

				return (
					<div
						className='flex flex-col gap-0.5 overflow-hidden rounded-md bg-sf-selection-surface'
						key={`sel-${gi}`}
					>
						{group.items.map((item, ii) => {
							if (!isValidElement(item.child)) {
								return <Fragment key={item.id ?? ii}>{item.child}</Fragment>
							}

							const childElement = item.child as ReactElement<{
								className?: string
								selectionGroupPosition?: RowSelectionGroupPosition
							}>
							const selectionGroupPosition = getSelectionGroupPosition(ii, group.items.length)
							return cloneElement(childElement, {
								selectionGroupPosition,
							})
						})}
					</div>
				)
			})}
		</div>
	)
}

function getSelectionGroupPosition(index: number, groupSize: number): RowSelectionGroupPosition {
	if (groupSize <= 1) {
		return 'single'
	}

	if (index === 0) {
		return 'first'
	}

	if (index === groupSize - 1) {
		return 'last'
	}

	return 'middle'
}

export type BoardCollapsibleSectionProps = {
	label: string
	count: number
	icon: ReactNode
	trailing?: ReactNode
	className?: string
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedIdSet?: Set<string>
	getItemId?: (child: ReactNode, index: number) => string | undefined
	contextMenuContent?: ReactNode
	children: ReactNode
}

/**
 * 折叠 section 共享骨架。
 * 封装 Collapsible + header(chevron + icon + label + count + trailing) + BoardRows。
 * 各 board 只需传 icon 和 trailing 的差异部分。
 */
export function BoardCollapsibleSection({
	label,
	count,
	icon,
	trailing,
	className,
	open,
	onOpenChange,
	selectedIdSet,
	getItemId,
	contextMenuContent,
	children,
}: BoardCollapsibleSectionProps) {
	const header = (
		<div
			className={BOARD_GROUP_HEADER_CLASS}
			data-board-section-header='true'
			onDoubleClick={() => onOpenChange(!open)}
		>
			<CollapsibleTrigger
				aria-label={`切换 ${label} 分区折叠状态`}
				className={entityBoardSectionToggleClass}
			>
				<BoardChevron data-chevron />
			</CollapsibleTrigger>
			<div className={entityBoardSectionHeadingClass}>
				{icon}
				<span className='truncate'>{label}</span>
				<Badge className={entityBoardSectionCountBadgeClass} variant='secondary'>
					{count}
				</Badge>
			</div>
			{trailing ?? <span className={entityBoardSectionRightSpacerClass} />}
		</div>
	)

	return (
		<Collapsible
			className={cn(BOARD_COLLAPSIBLE_CLASS, className)}
			data-board-section='true'
			onOpenChange={onOpenChange}
			open={open}
		>
			{contextMenuContent ? (
				<ContextMenu>
					<ContextMenuTrigger asChild>{header}</ContextMenuTrigger>
					{contextMenuContent}
				</ContextMenu>
			) : (
				header
			)}
			<CollapsibleContent className='overflow-hidden px-0'>
				<BoardRows getItemId={getItemId} selectedIdSet={selectedIdSet}>
					{children}
				</BoardRows>
			</CollapsibleContent>
		</Collapsible>
	)
}

export function BoardChevron({ className, ...props }: ComponentProps<'span'>) {
	return (
		<span
			{...props}
			className={cn('inline-flex size-3 shrink-0 items-center justify-center', className)}
		>
			<TriangleIcon className='size-1.5 rotate-90 text-sf-icon-subtle' fill='currentColor' />
		</span>
	)
}

export function BoardLoadingState({
	label = '正在读取列表…',
	className,
}: {
	label?: ReactNode
	className?: string
}) {
	return (
		<EmptyPage>
			<div className={cn(entityBoardLoadingCardClass, className)}>{label}</div>
		</EmptyPage>
	)
}

export function BoardEmptyState({
	icon,
	title,
	description,
	actionLabel,
	onAction,
	emptyClassName,
}: {
	icon: ReactNode
	title: ReactNode
	description?: ReactNode
	actionLabel?: string
	onAction?: () => void
	emptyClassName?: string
}) {
	return (
		<EmptyPage>
			<Empty className={emptyClassName}>
				<EmptyHeader>
					<EmptyMedia variant='icon'>{icon}</EmptyMedia>
					<EmptyTitle>{title}</EmptyTitle>
					{description ? <EmptyDescription>{description}</EmptyDescription> : null}
				</EmptyHeader>
				{onAction && actionLabel ? (
					<EmptyContent>
						<Button onClick={onAction} type='button'>
							{actionLabel}
						</Button>
					</EmptyContent>
				) : null}
			</Empty>
		</EmptyPage>
	)
}
