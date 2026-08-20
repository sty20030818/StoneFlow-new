import type { ReactNode } from 'react'
import { Checkbox } from '@heroui/react'

import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
import { formatShortDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'

type StopEvent = {
	stopPropagation: () => void
}

function stopRowEventPropagation(event: StopEvent) {
	event.stopPropagation()
}

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
			onClick={stopRowEventPropagation}
			onPointerDownCapture={stopRowEventPropagation}
		>
			<Checkbox.Content>
				<Checkbox.Control>
					<Checkbox.Indicator />
				</Checkbox.Control>
			</Checkbox.Content>
		</Checkbox>
	)
	const renderCell = (content: ReactNode) => (
		<span
			className={cn(
				'flex size-5 shrink-0 items-center justify-center',
				checked
					? 'opacity-100'
					: 'opacity-0 group-hover/row-shell:opacity-100 group-has-focus-visible/row-shell:opacity-100',
			)}
			data-slot='row-selection-cell'
			onKeyDownCapture={stopRowEventPropagation}
		>
			{content}
		</span>
	)

	if (disabled) {
		return (
			<DisabledActionTooltip
				ariaLabel={ariaLabel}
				label={label}
				reason={disabledReason}
				shortcut={tooltipShortcut}
			>
				{renderCell(checkbox)}
			</DisabledActionTooltip>
		)
	}

	return renderCell(
		<ActionTooltip label={label} shortcut={tooltipShortcut}>
			{checkbox}
		</ActionTooltip>,
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
