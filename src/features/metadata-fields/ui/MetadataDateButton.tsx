import type { ReactNode } from 'react'

import { MetadataFieldButton } from './MetadataFieldButton'

export type MetadataDateButtonProps = {
	labelPrefix: string
	value: string | null | undefined
	icon: ReactNode
	formatter?: (value: string) => string
	disabled?: boolean
	stopPropagation?: boolean
	compact?: boolean
	ariaLabel?: string
}

export function MetadataDateButton({
	labelPrefix,
	value,
	icon,
	formatter = (next) => next,
	disabled,
	stopPropagation,
	compact = false,
	ariaLabel,
}: MetadataDateButtonProps) {
	if (!value) {
		return null
	}

	return (
		<MetadataFieldButton
			ariaLabel={ariaLabel}
			compact={compact}
			disabled={disabled}
			icon={icon}
			label={`${labelPrefix} ${formatter(value)}`}
			stopPropagation={stopPropagation}
		/>
	)
}
