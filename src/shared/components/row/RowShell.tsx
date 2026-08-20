import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

const ROW_SHELL_BASE_CLASS =
	'group/row-shell flex h-11 min-w-0 items-center gap-3 rounded-lg border border-transparent bg-transparent px-3 text-left text-sm leading-5'
const ROW_SHELL_ACTIVE_CLASS = 'border-border-secondary bg-accent-soft'
const ROW_SHELL_FOCUS_CLASS =
	'-outline-offset-2 outline-2 outline-focus-subtle forced-colors:outline-[Highlight]'
const ROW_SHELL_SELECTED_CLASS = 'border-transparent bg-accent-soft'

export type RowSelectionGroupPosition = 'single' | 'first' | 'middle' | 'last'

const ROW_SHELL_GROUP_POSITION_CLASS: Record<RowSelectionGroupPosition, string> = {
	single: 'rounded-lg',
	first: 'rounded-none rounded-t-lg',
	middle: 'rounded-none',
	last: 'rounded-none rounded-b-lg',
}

type RowShellProps = ComponentProps<'div'> & {
	active?: boolean
	selected?: boolean
	hovered?: boolean
	hoverSource?: 'pointer' | 'keyboard' | null
	pending?: boolean
	interactive?: boolean
	selectionGroupPosition?: RowSelectionGroupPosition
}

export function RowShell({
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
}: RowShellProps) {
	const groupedSelected = selected && !!selectionGroupPosition
	const selectionClass = selected
		? hovered
			? 'border-transparent bg-accent-soft-hover'
			: ROW_SHELL_SELECTED_CLASS
		: hovered && !active
			? 'bg-surface-hover'
			: null
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
						? 'focus-visible:-outline-offset-2 focus-visible:bg-accent-soft-hover focus-visible:outline-2 focus-visible:outline-focus-subtle forced-colors:focus-visible:outline-[Highlight]'
						: 'focus-visible:-outline-offset-2 focus-visible:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus-subtle forced-colors:focus-visible:outline-[Highlight]'
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
