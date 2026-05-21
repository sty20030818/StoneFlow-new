import type { ReactNode } from 'react'

import { MetadataFieldButton } from './MetadataFieldButton'

export type MetadataDateButtonProps = {
	labelPrefix: string
	value: string | null | undefined
	icon: ReactNode
	formatter?: (value: string) => string
	disabled?: boolean
	stopPropagation?: boolean
}

export function MetadataDateButton({
	labelPrefix,
	value,
	icon,
	formatter = (next) => next,
	disabled,
	stopPropagation,
}: MetadataDateButtonProps) {
	if (!value) {
		return null
	}

	return (
		<MetadataFieldButton
			disabled={disabled}
			icon={icon}
			label={`${labelPrefix} ${formatter(value)}`}
			stopPropagation={stopPropagation}
		/>
	)
}
