import type { ReactNode } from 'react'
import { ContextMenu } from '@heroui-pro/react'
import { CheckIcon, FolderIcon, MinusIcon, TargetIcon } from 'lucide-react'
import type { TaskPlacementTarget } from '@/features/metadata-fields'

import type { PropertyOptionIndicator } from './task-context-menu-helpers'

export function getPlacementIcon(target: TaskPlacementTarget) {
	if (target.kind === 'project') {
		return <FolderIcon />
	}

	return <TargetIcon />
}

export function PropertySubTrigger({
	children,
	disabledReason,
	id,
	isDisabled,
	icon,
	shortcut,
	textValue,
}: {
	children: ReactNode
	disabledReason?: string
	id: string
	isDisabled?: boolean
	icon: ReactNode
	shortcut: ReactNode
	textValue: string
}) {
	return (
		<ContextMenu.Item
			aria-description={isDisabled ? disabledReason : undefined}
			id={id}
			isDisabled={isDisabled}
			textValue={textValue}
		>
			{icon}
			<span>{children}</span>
			<MenuShortcut>{shortcut}</MenuShortcut>
			<ContextMenu.SubmenuIndicator className='ml-1' />
		</ContextMenu.Item>
	)
}

export function PropertyOptionItem({
	children,
	checked = false,
	id,
	indicator = checked ? 'checked' : null,
	isDisabled,
	icon,
	onAction,
	shortcut,
	textValue,
	trailing,
}: {
	children: ReactNode
	checked?: boolean
	id: string
	indicator?: PropertyOptionIndicator
	isDisabled?: boolean
	icon: ReactNode
	onAction: () => void
	shortcut?: string
	textValue: string
	trailing?: ReactNode
}) {
	return (
		<ContextMenu.Item id={id} isDisabled={isDisabled} onAction={onAction} textValue={textValue}>
			{icon}
			<span className='min-w-0 flex-1 truncate'>{children}</span>
			<span className='ml-auto flex min-w-12 items-center justify-end gap-2 text-[11px] text-muted-foreground'>
				<PropertyOptionIndicatorIcon indicator={indicator} />
				{shortcut ? <span className='tabular-nums'>{shortcut}</span> : null}
				{!shortcut && trailing ? <span className='tabular-nums'>{trailing}</span> : null}
			</span>
		</ContextMenu.Item>
	)
}

function PropertyOptionIndicatorIcon({ indicator }: { indicator: PropertyOptionIndicator }) {
	if (indicator === 'checked') {
		return <CheckIcon className='size-3.5 text-legacy-foreground' />
	}

	if (indicator === 'mixed') {
		return <MinusIcon className='size-3.5 text-legacy-foreground' />
	}

	return <CheckIcon className='invisible size-3.5' />
}

export function MenuShortcut({ children }: { children: ReactNode }) {
	return <span className='ml-auto text-[11px] text-muted-foreground'>{children}</span>
}
