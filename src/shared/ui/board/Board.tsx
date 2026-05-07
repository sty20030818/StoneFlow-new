import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
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
} from '@/shared/ui/patterns/entity-board'
import { TASK_ROW_SECTION_HEADER_CLASS } from '@/shared/ui/patterns/task-row'
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

export type BoardRowsProps = ComponentProps<'div'>

export const BOARD_STACK_CLASS = 'flex min-h-0 flex-1 flex-col gap-3'
export const BOARD_GROUP_CLASS = 'flex flex-col gap-1'
export const BOARD_ROWS_CLASS = 'flex flex-col gap-1'
export const BOARD_COLLAPSIBLE_CLASS =
	'flex flex-col gap-1 [&[data-state=open]_[data-chevron]]:rotate-90'
export const BOARD_GROUP_HEADER_CLASS = TASK_ROW_SECTION_HEADER_CLASS

/**
 * 页级 board 主容器，只负责纵向堆叠分组。
 */
export function BoardRoot({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn(BOARD_STACK_CLASS, className)}>
			{children}
		</div>
	)
}

/**
 * 单个分组容器，承载 header 和 rows。
 */
export function BoardGroup({ children, className, ...props }: ComponentProps<'section'>) {
	return (
		<section {...props} className={cn(BOARD_GROUP_CLASS, className)}>
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
		<div className={cn('flex items-center justify-between gap-3 px-1', className)}>
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

export function BoardRows({ children, className, ...props }: BoardRowsProps) {
	return (
		<div {...props} className={cn(BOARD_ROWS_CLASS, className)}>
			{children}
		</div>
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
