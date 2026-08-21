import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

export type RowSelectionGroupPosition = 'single' | 'first' | 'middle' | 'last'

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
	return (
		<div
			{...props}
			data-active={active || undefined}
			data-hover-source={hoverSource ?? undefined}
			data-hovered={hovered || undefined}
			data-interactive={interactive || undefined}
			data-pending={pending || undefined}
			data-selected={selected || undefined}
			data-selection-group-position={selectionGroupPosition}
			data-row-shell='true'
			className={cn(
				'group/row-shell flex h-11 min-w-0 items-center gap-3 px-3 text-left text-sm leading-5 outline-none',
				className,
			)}
			role={interactive ? (role ?? 'button') : role}
			tabIndex={interactive ? (tabIndex ?? -1) : tabIndex}
		>
			{children}
		</div>
	)
}
