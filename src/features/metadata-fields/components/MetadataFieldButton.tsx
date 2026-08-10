import { forwardRef, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'
import { OverflowTooltip } from '@/shared/components/tooltip'

type StopEvent = {
	stopPropagation: () => void
}

function stopMetadataFieldEventPropagation(event: StopEvent) {
	event.stopPropagation()
}

export type MetadataFieldButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
	icon?: ReactNode
	label: ReactNode
	trailing?: ReactNode
	ariaLabel?: string
	stopPropagation?: boolean
	compact?: boolean
	appearance?: 'default' | 'row-icon'
	suppressOverflowTooltip?: boolean
}

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
			suppressOverflowTooltip = false,
			className,
			onClick,
			onKeyDownCapture,
			onPointerDown,
			variant = 'outline',
			size = 'sm',
			type = 'button',
			...props
		},
		ref,
	) {
		if (appearance === 'row-icon') {
			return (
				<button
					{...props}
					aria-label={ariaLabel}
					className={cn(
						'flex size-5 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-foreground shadow-none transition-colors outline-none focus-visible:border-border focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50',
						className,
					)}
					onClick={(event) => {
						if (stopPropagation) {
							stopMetadataFieldEventPropagation(event)
						}
						onClick?.(event)
					}}
					onKeyDownCapture={(event) => {
						if (stopPropagation) {
							stopMetadataFieldEventPropagation(event)
						}
						onKeyDownCapture?.(event)
					}}
					onPointerDown={(event) => {
						if (stopPropagation) {
							stopMetadataFieldEventPropagation(event)
						}
						onPointerDown?.(event)
					}}
					ref={ref}
					type={type}
				>
					{icon}
					<span className='sr-only'>{label}</span>
				</button>
			)
		}

		return (
			<Button
				{...props}
				aria-label={ariaLabel}
				className={cn(compact ? 'max-w-45' : 'max-w-52', className)}
				onClick={(event) => {
					if (stopPropagation) {
						stopMetadataFieldEventPropagation(event)
					}
					onClick?.(event)
				}}
				onKeyDownCapture={(event) => {
					if (stopPropagation) {
						stopMetadataFieldEventPropagation(event)
					}
					onKeyDownCapture?.(event)
				}}
				onPointerDown={(event) => {
					if (stopPropagation) {
						stopMetadataFieldEventPropagation(event)
					}
					onPointerDown?.(event)
				}}
				ref={ref}
				size={size}
				type={type}
				variant={variant}
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
			</Button>
		)
	},
)
