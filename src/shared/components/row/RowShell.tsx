import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'
import {
	ROW_SHELL_ACTIONS_CLASS,
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_BASE_CLASS,
	ROW_SHELL_GROUP_POSITION_CLASS,
	ROW_SHELL_IDLE_CLASS,
	ROW_SHELL_FOCUS_CLASS,
	ROW_SHELL_SELECTED_CLASS,
	type RowSelectionGroupPosition,
} from '@/shared/components/patterns/row-tokens'

export type RowShellRootProps = ComponentProps<'div'> & {
	active?: boolean
	selected?: boolean
	hovered?: boolean
	hoverSource?: 'pointer' | 'keyboard' | null
	pending?: boolean
	interactive?: boolean
	selectionGroupPosition?: RowSelectionGroupPosition
}

export function RowShellRoot({
	children,
	className,
	active = false,
	selected = false,
	hovered = false,
	hoverSource = null,
	pending = false,
	interactive = false,
	selectionGroupPosition,
	role,
	tabIndex,
	...props
}: RowShellRootProps) {
	const groupedSelected = selected && !!selectionGroupPosition
	const idleClass = hovered ? null : ROW_SHELL_IDLE_CLASS
	const selectionClass = selected
		? hovered
			? 'border-transparent bg-accent-soft-hover'
			: ROW_SHELL_SELECTED_CLASS
		: hovered && !active
			? 'bg-surface-hover'
			: idleClass
	const focusBorderClass = hovered && hoverSource === 'keyboard' ? ROW_SHELL_FOCUS_CLASS : null

	return (
		<div
			{...props}
			data-selection-group-position={selectionGroupPosition}
			className={cn(
				ROW_SHELL_BASE_CLASS,
				active ? ROW_SHELL_ACTIVE_CLASS : selectionClass,
				// 指针 hover 用 CSS，避免父级 React state 刷全表（键盘 hover 仍走 hovered prop）
				interactive && !hovered && !active
					? selected
						? 'hover:bg-accent-soft-hover'
						: 'hover:bg-surface-hover'
					: null,
				interactive
					? selected
						? 'focus-visible:border-focus-subtle focus-visible:bg-accent-soft-hover forced-colors:focus-visible:border-[Highlight]'
						: 'focus-visible:border-focus-subtle focus-visible:bg-surface-hover forced-colors:focus-visible:border-[Highlight]'
					: null,
				focusBorderClass,
				groupedSelected ? ROW_SHELL_GROUP_POSITION_CLASS[selectionGroupPosition] : null,
				interactive ? 'cursor-pointer' : null,
				pending ? 'opacity-75' : null,
				className,
			)}
			role={interactive ? (role ?? 'button') : role}
			tabIndex={interactive ? (tabIndex ?? -1) : tabIndex}
		>
			{children}
		</div>
	)
}

export function RowShellLeft({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn('flex min-w-0 flex-1 items-center gap-2.5', className)}>
			{children}
		</div>
	)
}

export function RowShellLeading({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn('flex shrink-0 items-center gap-1', className)}>
			{children}
		</div>
	)
}

export function RowShellIcon({ children, className, ...props }: ComponentProps<'span'>) {
	return (
		<span
			{...props}
			className={cn(
				'flex size-4 shrink-0 items-center justify-center text-sf-shell-text-secondary',
				className,
			)}
		>
			{children}
		</span>
	)
}

export function RowShellTitle({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn('min-w-0 flex-1', className)}>
			{children}
		</div>
	)
}

export function RowShellRight({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn('ml-auto flex shrink-0 items-center gap-2', className)}>
			{children}
		</div>
	)
}

export function RowShellFields({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn('hidden shrink-0 items-center justify-end gap-2', className)}>
			{children}
		</div>
	)
}

export function RowShellActions({ children, className, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn(ROW_SHELL_ACTIONS_CLASS, className)}>
			{children}
		</div>
	)
}

export const RowShell = Object.assign(RowShellRoot, {
	Root: RowShellRoot,
	Left: RowShellLeft,
	Leading: RowShellLeading,
	Icon: RowShellIcon,
	Title: RowShellTitle,
	Right: RowShellRight,
	Fields: RowShellFields,
	Actions: RowShellActions,
})
