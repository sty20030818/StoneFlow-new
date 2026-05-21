import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'

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
}

export function MetadataFieldButton({
	icon,
	label,
	trailing = null,
	ariaLabel,
	stopPropagation = false,
	className,
	onClick,
	onKeyDownCapture,
	onPointerDown,
	variant = 'outline',
	size = 'sm',
	type = 'button',
	...props
}: MetadataFieldButtonProps) {
	return (
		<Button
			{...props}
			aria-label={ariaLabel}
			className={cn('max-w-52', className)}
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
			size={size}
			type={type}
			variant={variant}
		>
			{icon}
			<span className='min-w-0 truncate'>{label}</span>
			{trailing}
		</Button>
	)
}

export { stopMetadataFieldEventPropagation }
