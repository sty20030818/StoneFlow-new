import type { ReactNode } from 'react'
import { Checkbox } from '@heroui/react'

import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
import { formatShortDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'

export function TaskRowSelectionCell({
	ariaLabel,
	checked,
	disabled,
	disabledReason,
	label,
	tooltipShortcut,
	onCheckedChange,
}: {
	ariaLabel: string
	checked: boolean
	disabled: boolean
	disabledReason: ReactNode
	label: string
	tooltipShortcut: ReactNode
	onCheckedChange: () => void
}) {
	const checkbox = (
		<Checkbox
			aria-label={ariaLabel}
			isDisabled={disabled}
			isSelected={checked}
			onChange={onCheckedChange}
		>
			<Checkbox.Content>
				<Checkbox.Control>
					<Checkbox.Indicator />
				</Checkbox.Control>
			</Checkbox.Content>
		</Checkbox>
	)

	if (disabled) {
		return (
			<DisabledActionTooltip
				ariaLabel={ariaLabel}
				label={label}
				reason={disabledReason}
				shortcut={tooltipShortcut}
			>
				{checkbox}
			</DisabledActionTooltip>
		)
	}

	return (
		<ActionTooltip label={label} shortcut={tooltipShortcut}>
			{checkbox}
		</ActionTooltip>
	)
}

export function TaskRowTitleCell({ title, doneLike }: { title: string; doneLike: boolean }) {
	return (
		<OverflowTooltip
			className={cn(
				'truncate font-medium text-foreground',
				doneLike ? 'text-muted line-through' : null,
			)}
			content={title}
		>
			{title}
		</OverflowTooltip>
	)
}

export function TaskRowCreatedAtCell({ value }: { value: string | null | undefined }) {
	if (!value) return null

	return <span className='shrink-0 text-xs tabular-nums text-muted'>{formatShortDate(value)}</span>
}
