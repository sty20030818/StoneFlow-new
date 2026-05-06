import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import {
	entityBoardCompactBadgeClass,
	entityBoardRowActionsClass,
	entityBoardSectionCountBadgeClass,
} from '@/shared/ui/patterns/entity-board'
import {
	TASK_ROW_ACTIVE_CLASS,
	TASK_ROW_BASE_CLASS,
	TASK_ROW_IDLE_CLASS,
	TASK_ROW_META_TEXT_CLASS,
	TASK_ROW_SECTION_HEADER_CLASS,
} from '@/shared/ui/patterns/task-row'
import { Badge } from '@/shared/ui/base/badge'
import { TriangleIcon } from 'lucide-react'

export type CanonicalBoardSection<T> = {
	key: string
	label: string
	items: T[]
}

export type CanonicalBoardSectionHeaderProps = {
	title: ReactNode
	count?: number
	leading?: ReactNode
	trailing?: ReactNode
	className?: string
	titleClassName?: string
}

export type CanonicalBoardRowSurfaceProps = ComponentProps<'div'> & {
	isActive?: boolean
	isSelected?: boolean
	isPending?: boolean
	selectedClassName?: string
}

export type CanonicalBoardLeadSlot = ReactNode
export type CanonicalBoardMetaSlot = ReactNode

export const CANONICAL_BOARD_STACK_CLASS = 'flex min-h-0 flex-1 flex-col gap-3'
export const CANONICAL_BOARD_SECTION_CLASS = 'flex flex-col gap-1'
export const CANONICAL_BOARD_ROWS_CLASS = 'flex flex-col gap-1'
export const CANONICAL_BOARD_COLLAPSIBLE_CLASS =
	'flex flex-col gap-1 [&[data-state=open]_[data-chevron]]:rotate-90'
export const CANONICAL_BOARD_SECTION_HEADER_CLASS = TASK_ROW_SECTION_HEADER_CLASS
export const CANONICAL_BOARD_META_TEXT_CLASS = TASK_ROW_META_TEXT_CLASS
export const CANONICAL_BOARD_ROW_BASE_CLASS = TASK_ROW_BASE_CLASS
export const CANONICAL_BOARD_ROW_IDLE_CLASS = TASK_ROW_IDLE_CLASS
export const CANONICAL_BOARD_ROW_ACTIVE_CLASS = TASK_ROW_ACTIVE_CLASS

export function CanonicalBoardRoot({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return <div className={cn(CANONICAL_BOARD_STACK_CLASS, className)}>{children}</div>
}

export function CanonicalBoardSectionComponent({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return <section className={cn(CANONICAL_BOARD_SECTION_CLASS, className)}>{children}</section>
}

export function CanonicalBoardSectionHeader({
	title,
	count,
	leading,
	trailing,
	className,
	titleClassName,
}: CanonicalBoardSectionHeaderProps) {
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

export function CanonicalBoardRows({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return <div className={cn(CANONICAL_BOARD_ROWS_CLASS, className)}>{children}</div>
}

export function CanonicalBoardRow({
	children,
	className,
	isActive = false,
	isSelected = false,
	isPending = false,
	selectedClassName,
	...props
}: CanonicalBoardRowSurfaceProps) {
	return (
		<div
			{...props}
			className={cn(
				CANONICAL_BOARD_ROW_BASE_CLASS,
				isActive
					? CANONICAL_BOARD_ROW_ACTIVE_CLASS
					: isSelected
						? selectedClassName
						: CANONICAL_BOARD_ROW_IDLE_CLASS,
				isPending ? 'opacity-75' : null,
				className,
			)}
		>
			{children}
		</div>
	)
}

export function CanonicalBoardLead({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return <div className={cn('flex shrink-0 items-center gap-1', className)}>{children}</div>
}

export function CanonicalBoardMain({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return <div className={cn('min-w-0 flex-1', className)}>{children}</div>
}

export function CanonicalBoardMeta({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'hidden shrink-0 text-right md:block',
				CANONICAL_BOARD_META_TEXT_CLASS,
				className,
			)}
		>
			{children}
		</div>
	)
}

export function CanonicalBoardActions({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn(entityBoardRowActionsClass, className)}>
			{children}
		</div>
	)
}

export function CanonicalBoardChevron({ className, ...props }: ComponentProps<'span'>) {
	return (
		<span
			{...props}
			className={cn('inline-flex size-3 shrink-0 items-center justify-center', className)}
		>
			<TriangleIcon className='size-1.5 rotate-90 text-sf-icon-subtle' fill='currentColor' />
		</span>
	)
}

export const CanonicalBoard = Object.assign(CanonicalBoardRoot, {
	Root: CanonicalBoardRoot,
	Section: CanonicalBoardSectionComponent,
	SectionHeader: CanonicalBoardSectionHeader,
	Rows: CanonicalBoardRows,
	Row: CanonicalBoardRow,
	RowLead: CanonicalBoardLead,
	RowMain: CanonicalBoardMain,
	RowMeta: CanonicalBoardMeta,
	RowActions: CanonicalBoardActions,
	Chevron: CanonicalBoardChevron,
})
