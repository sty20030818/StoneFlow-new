import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { entityBoardRowActionsClass } from '@/shared/ui/patterns/entity-board'
import {
	TASK_ROW_ACTIVE_CLASS,
	TASK_ROW_BASE_CLASS,
	TASK_ROW_IDLE_CLASS,
	TASK_ROW_META_TEXT_CLASS,
} from '@/shared/ui/patterns/task-row'

export type LegacyRowSurfaceProps = ComponentProps<'div'> & {
	isActive?: boolean
	isSelected?: boolean
	isPending?: boolean
	selectedClassName?: string
}

export const LEGACY_ROW_BASE_CLASS = TASK_ROW_BASE_CLASS
export const LEGACY_ROW_IDLE_CLASS = TASK_ROW_IDLE_CLASS
export const LEGACY_ROW_ACTIVE_CLASS = TASK_ROW_ACTIVE_CLASS
export const LEGACY_ROW_META_TEXT_CLASS = TASK_ROW_META_TEXT_CLASS

/**
 * 过渡期行表面：只承载既有行布局和交互语义，避免和 board/group 容器耦合。
 */
export function LegacyRowSurface({
	children,
	className,
	isActive = false,
	isSelected = false,
	isPending = false,
	selectedClassName,
	...props
}: LegacyRowSurfaceProps) {
	return (
		<div
			{...props}
			className={cn(
				LEGACY_ROW_BASE_CLASS,
				isActive
					? LEGACY_ROW_ACTIVE_CLASS
					: isSelected
						? selectedClassName
						: LEGACY_ROW_IDLE_CLASS,
				isPending ? 'opacity-75' : null,
				className,
			)}
		>
			{children}
		</div>
	)
}

export function LegacyRowLead({
	children,
	className,
	...props
}: ComponentProps<'div'> & {
	children: ReactNode
}) {
	return (
		<div {...props} className={cn('flex shrink-0 items-center gap-1', className)}>
			{children}
		</div>
	)
}

export function LegacyRowMain({
	children,
	className,
	...props
}: ComponentProps<'div'> & {
	children: ReactNode
}) {
	return (
		<div {...props} className={cn('min-w-0 flex-1', className)}>
			{children}
		</div>
	)
}

export function LegacyRowMeta({
	children,
	className,
	...props
}: ComponentProps<'div'> & {
	children: ReactNode
}) {
	return (
		<div
			{...props}
			className={cn('hidden shrink-0 text-right md:block', LEGACY_ROW_META_TEXT_CLASS, className)}
		>
			{children}
		</div>
	)
}

export function LegacyRowActions({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn(entityBoardRowActionsClass, className)}>
			{children}
		</div>
	)
}
