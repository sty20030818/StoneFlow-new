import type { ReactNode } from 'react'

import { CheckIcon, MinusIcon } from 'lucide-react'

import type { MetadataFieldIndicator } from '@/features/metadata-fields/core'
import { DropdownMenuItem } from '@/shared/ui/base/dropdown-menu'
import { ShortcutMenuItemHint } from '@/shared/ui/shortcut-menu'

export type MetadataFieldMenuItemProps<TValue> = {
	value: TValue
	label: ReactNode
	icon?: ReactNode
	trailing?: ReactNode
	digit?: string
	indicator?: MetadataFieldIndicator
	disabled?: boolean
	stopPropagation?: boolean
	onSelect: (value: TValue) => void
}

export function MetadataFieldMenuItem<TValue>({
	value,
	label,
	icon,
	trailing,
	digit,
	indicator = null,
	disabled,
	stopPropagation,
	onSelect,
}: MetadataFieldMenuItemProps<TValue>) {
	return (
		<DropdownMenuItem
			className='gap-2 p-2'
			disabled={disabled}
			onClick={(event) => {
				if (stopPropagation) {
					event.stopPropagation()
				}
			}}
			onPointerDown={(event) => {
				if (stopPropagation) {
					event.stopPropagation()
				}
			}}
			onSelect={() => onSelect(value)}
		>
			{icon}
			<span className='min-w-0 flex-1 truncate'>{label}</span>
			<span className='ml-auto flex min-w-12 items-center justify-end gap-2 text-[11px] text-muted-foreground'>
				<MetadataFieldIndicatorIcon indicator={indicator} />
				{digit ? <ShortcutMenuItemHint digit={digit} /> : null}
				{trailing ? <span className='tabular-nums'>{trailing}</span> : null}
			</span>
		</DropdownMenuItem>
	)
}

function MetadataFieldIndicatorIcon({ indicator }: { indicator: MetadataFieldIndicator }) {
	if (indicator === 'checked') {
		return (
			<CheckIcon className='size-3.5 text-sf-icon-secondary' data-slot='metadata-field-indicator' />
		)
	}

	if (indicator === 'mixed') {
		return (
			<MinusIcon className='size-3.5 text-sf-icon-secondary' data-slot='metadata-field-indicator' />
		)
	}

	return <CheckIcon className='invisible size-3.5' data-slot='metadata-field-indicator' />
}
