import type { ReactNode } from 'react'

import { Dropdown, Kbd } from '@heroui/react'
import { CheckIcon, MinusIcon } from 'lucide-react'

import type { MetadataFieldIndicator } from '@/features/metadata-fields/core'
import { cn } from '@/shared/lib/utils'

export type MetadataFieldMenuItemProps<TValue> = {
	id: string
	value: TValue
	label: string
	icon?: ReactNode
	trailing?: ReactNode
	digit?: string
	indicator?: MetadataFieldIndicator
	disabled?: boolean
	stopPropagation?: boolean
	onSelect: (value: TValue) => void
}

export function MetadataFieldMenuItem<TValue>({
	id,
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
		<Dropdown.Item
			className='gap-2 p-2'
			id={id}
			isDisabled={disabled}
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
			onAction={() => onSelect(value)}
			textValue={label}
		>
			{icon}
			<span className='min-w-0 flex-1 truncate'>{label}</span>
			<span
				className={cn(
					'ml-auto shrink-0 items-center text-[11px] text-muted',
					hasTrailing
						? 'grid grid-cols-[0.875rem_auto_auto] gap-x-1.5'
						: 'grid grid-cols-[0.875rem_auto] gap-x-1.5',
				)}
			>
				<span className='flex items-center justify-center'>
					<MetadataFieldIndicatorIcon indicator={indicator} />
				</span>
				<span className='flex items-center justify-center'>
					{digit ? (
						<Kbd aria-hidden data-slot='shortcut-menu-item-hint' variant='light'>
							<Kbd.Content>{digit}</Kbd.Content>
						</Kbd>
					) : null}
				</span>
				{hasTrailing ? <span className='min-w-0 text-right tabular-nums'>{trailing}</span> : null}
			</span>
		</Dropdown.Item>
	)
}

function MetadataFieldIndicatorIcon({ indicator }: { indicator: MetadataFieldIndicator }) {
	if (indicator === 'checked') {
		return (
			<CheckIcon
				className='size-3.5 text-muted'
				data-indicator='checked'
				data-slot='metadata-field-indicator'
			/>
		)
	}

	if (indicator === 'mixed') {
		return (
			<MinusIcon
				className='size-3.5 text-muted'
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
