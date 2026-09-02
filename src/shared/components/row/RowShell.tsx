import type { ComponentProps } from 'react'

import { COLLECTION_ROW_HEIGHT } from '@/shared/components/collectionGeometry'
import { cn } from '@/shared/lib/utils'

type RowShellProps = ComponentProps<'div'> & {
	active?: boolean
	selected?: boolean
	hovered?: boolean
	hoverSource?: 'pointer' | 'keyboard' | null
	pending?: boolean
	interactive?: boolean
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
	role,
	style,
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
			data-row-shell='true'
			className={cn(
				'group/row-shell @container/row flex min-w-0 items-center px-3 text-left text-sm leading-5 outline-none',
				className,
			)}
			role={interactive ? (role ?? 'button') : role}
			style={{ ...style, height: COLLECTION_ROW_HEIGHT }}
			tabIndex={interactive ? (tabIndex ?? -1) : tabIndex}
		>
			{children}
		</div>
	)
}
