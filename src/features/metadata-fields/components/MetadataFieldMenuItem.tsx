import type { ReactNode } from 'react'

import { CheckIcon, MinusIcon } from 'lucide-react'

import type { MetadataFieldIndicator } from '@/features/metadata-fields/core'
import { cn } from '@/shared/lib/utils'
import { DropdownMenuItem } from '@/shared/components/base/dropdown-menu'
import { ShortcutMenuItemHint } from '@/shared/components/shortcut-menu'

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
	const hasTrailing = trailing !== undefined && trailing !== null

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
			<span
				className={cn(
					'ml-auto shrink-0 items-center text-[11px] text-muted-foreground',
					hasTrailing
						? 'grid grid-cols-[0.875rem_1rem_auto] gap-x-1.5'
						: 'grid grid-cols-[0.875rem_1rem] gap-x-1.5',
				)}
			>
				<span className='flex items-center justify-center'>
					<MetadataFieldIndicatorIcon indicator={indicator} />
				</span>
				<span className='flex items-center justify-center'>
					{digit ? <ShortcutMenuItemHint digit={digit} /> : null}
				</span>
				{hasTrailing ? <span className='min-w-0 text-right tabular-nums'>{trailing}</span> : null}
			</span>
		</DropdownMenuItem>
	)
}

function MetadataFieldIndicatorIcon({ indicator }: { indicator: MetadataFieldIndicator }) {
	if (indicator === 'checked') {
		return (
			<CheckIcon
				className='size-3.5 text-sf-icon-secondary'
				data-indicator='checked'
				data-slot='metadata-field-indicator'
			/>
		)
	}

	if (indicator === 'mixed') {
		return (
			<MinusIcon
				className='size-3.5 text-sf-icon-secondary'
				data-indicator='mixed'
				data-slot='metadata-field-indicator'
			/>
		)
	}

	return (
		<CheckIcon
			className='invisible size-3.5'
			data-indicator='none'
			data-slot='metadata-field-indicator'
		/>
	)
}
