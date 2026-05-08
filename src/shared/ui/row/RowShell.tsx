import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'
import {
	ROW_SHELL_ACTIONS_CLASS,
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_BASE_CLASS,
	ROW_SHELL_IDLE_CLASS,
	ROW_SHELL_SELECTED_CLASS,
} from '@/shared/ui/patterns/row-tokens'

export type RowShellRootProps = ComponentProps<'div'> & {
	active?: boolean
	selected?: boolean
	pending?: boolean
	interactive?: boolean
	selectedClassName?: string
}

export function RowShellRoot({
	children,
	className,
	active = false,
	selected = false,
	pending = false,
	interactive = false,
	selectedClassName,
	role,
	tabIndex,
	...props
}: RowShellRootProps) {
	return (
		<div
			{...props}
			className={cn(
				ROW_SHELL_BASE_CLASS,
				active
					? ROW_SHELL_ACTIVE_CLASS
					: selected
						? selectedClassName ?? ROW_SHELL_SELECTED_CLASS
						: ROW_SHELL_IDLE_CLASS,
				interactive ? 'cursor-pointer' : null,
				pending ? 'opacity-75' : null,
				className,
			)}
			role={interactive ? role ?? 'button' : role}
			tabIndex={interactive ? tabIndex ?? 0 : tabIndex}
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
			className={cn('flex size-4 shrink-0 items-center justify-center text-sf-shell-secondary', className)}
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
		<div
			{...props}
			className={cn('hidden shrink-0 items-center justify-end gap-2 md:flex', className)}
		>
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
