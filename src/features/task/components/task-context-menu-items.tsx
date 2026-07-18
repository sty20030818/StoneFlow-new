import type { ReactNode } from 'react'
import { ContextMenuItem, ContextMenuSubTrigger } from '@/shared/components/base/context-menu'
import { CheckIcon, FolderIcon, InboxIcon, MinusIcon, TargetIcon } from 'lucide-react'
import type { TaskPlacementTarget } from '@/features/metadata-fields'

import type { PropertyOptionIndicator } from './task-context-menu-helpers'

export function getPlacementIcon(target: TaskPlacementTarget) {
	if (target.kind === 'project') {
		return <FolderIcon />
	}

	if (target.kind === 'inbox') {
		return <InboxIcon />
	}

	return <TargetIcon />
}

export function PropertySubTrigger({
	children,
	disabled,
	icon,
	shortcut,
}: {
	children: ReactNode
	disabled?: boolean
	icon: ReactNode
	shortcut: string
}) {
	return (
		<ContextMenuSubTrigger disabled={disabled} className='[&>svg:last-child]:ml-1'>
			{icon}
			<span>{children}</span>
			<MenuShortcut>{shortcut}</MenuShortcut>
		</ContextMenuSubTrigger>
	)
}

export function PropertyOptionItem({
	children,
	checked = false,
	indicator = checked ? 'checked' : null,
	disabled,
	icon,
	onSelect,
	shortcut,
	trailing,
}: {
	children: ReactNode
	checked?: boolean
	indicator?: PropertyOptionIndicator
	disabled?: boolean
	icon: ReactNode
	onSelect: () => void
	shortcut?: string
	trailing?: ReactNode
}) {
	return (
		<ContextMenuItem disabled={disabled} onSelect={onSelect}>
			{icon}
			<span className='min-w-0 flex-1 truncate'>{children}</span>
			<span className='ml-auto flex min-w-12 items-center justify-end gap-2 text-[11px] text-muted-foreground'>
				<PropertyOptionIndicatorIcon indicator={indicator} />
				{shortcut ? <span className='tabular-nums'>{shortcut}</span> : null}
				{!shortcut && trailing ? <span className='tabular-nums'>{trailing}</span> : null}
			</span>
		</ContextMenuItem>
	)
}

function PropertyOptionIndicatorIcon({ indicator }: { indicator: PropertyOptionIndicator }) {
	if (indicator === 'checked') {
		return <CheckIcon className='size-3.5 text-foreground' />
	}

	if (indicator === 'mixed') {
		return <MinusIcon className='size-3.5 text-foreground' />
	}

	return <CheckIcon className='invisible size-3.5' />
}

export function MenuShortcut({ children }: { children: ReactNode }) {
	return <span className='ml-auto text-[11px] text-muted-foreground'>{children}</span>
}
