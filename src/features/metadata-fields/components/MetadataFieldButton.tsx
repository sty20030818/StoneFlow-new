import { forwardRef, type ReactNode } from 'react'
import { Dropdown } from '@heroui/react'

import { OverflowTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'

type StopEvent = {
	stopPropagation: () => void
}

export type MetadataFieldButtonProps = {
	icon?: ReactNode
	label: ReactNode
	trailing?: ReactNode
	ariaLabel?: string
	stopPropagation?: boolean
	compact?: boolean
	appearance?: 'default' | 'row-icon'
	disabled?: boolean
	suppressOverflowTooltip?: boolean
}

/** Dropdown 专用触发按钮，外观与事件边界由 metadata-fields 自己拥有。 */
export const MetadataFieldButton = forwardRef<HTMLButtonElement, MetadataFieldButtonProps>(
	function MetadataFieldButton(
		{
			icon,
			label,
			trailing = null,
			ariaLabel,
			stopPropagation = false,
			compact = false,
			appearance = 'default',
			disabled,
			suppressOverflowTooltip = false,
		},
		ref,
	) {
		const stopWhenRequested = (event: StopEvent) => {
			if (stopPropagation) {
				event.stopPropagation()
			}
		}

		if (appearance === 'row-icon') {
			return (
				<Dropdown.Trigger
					aria-label={ariaLabel}
					className='flex size-5 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-foreground outline-none focus-visible:border-focus-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
					isDisabled={disabled}
					onClick={stopWhenRequested}
					onKeyDown={stopWhenRequested}
					onPointerDown={stopWhenRequested}
					ref={ref}
				>
					{icon}
					<span className='sr-only'>{label}</span>
				</Dropdown.Trigger>
			)
		}

		return (
			<Dropdown.Trigger
				aria-label={ariaLabel}
				className={cn(
					'flex h-8 items-center gap-1 rounded-full border border-default bg-default px-2.5 text-[13px] font-medium text-foreground shadow-xs outline-none focus-visible:border-focus-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
					compact ? 'max-w-45' : 'max-w-52',
				)}
				isDisabled={disabled}
				onClick={stopWhenRequested}
				onKeyDown={stopWhenRequested}
				onPointerDown={stopWhenRequested}
				ref={ref}
			>
				{icon}
				{suppressOverflowTooltip ? (
					<span className='block min-w-0 max-w-full truncate'>{label}</span>
				) : (
					<OverflowTooltip className='min-w-0' content={label}>
						{label}
					</OverflowTooltip>
				)}
				{trailing}
			</Dropdown.Trigger>
		)
	},
)
