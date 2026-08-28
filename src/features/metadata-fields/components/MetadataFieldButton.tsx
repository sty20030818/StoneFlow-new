import { forwardRef, type ReactNode } from 'react'
import { Button } from '@heroui/react'

import { OverflowTooltip } from '@/shared/components/tooltip'

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

/** Dropdown 专用触发按钮，只拥有字段尺寸、截断与事件边界。 */
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
				<Button
					aria-label={ariaLabel}
					className='shrink-0'
					isIconOnly
					isDisabled={disabled}
					onClick={stopWhenRequested}
					onKeyDown={stopWhenRequested}
					onPointerDown={stopWhenRequested}
					ref={ref}
					size='sm'
					type='button'
					variant='ghost'
				>
					{icon}
					<span className='sr-only'>{label}</span>
				</Button>
			)
		}

		return (
			<Button
				aria-label={ariaLabel}
				className={compact ? 'max-w-45' : 'max-w-52'}
				isDisabled={disabled}
				onClick={stopWhenRequested}
				onKeyDown={stopWhenRequested}
				onPointerDown={stopWhenRequested}
				ref={ref}
				size='sm'
				type='button'
				variant='ghost'
			>
				<span className='flex min-w-0 items-center gap-2 text-left'>
					{icon}
					{suppressOverflowTooltip ? (
						<span className='block min-w-0 max-w-full truncate'>{label}</span>
					) : (
						<OverflowTooltip className='min-w-0' content={label}>
							{label}
						</OverflowTooltip>
					)}
					{trailing}
				</span>
			</Button>
		)
	},
)
