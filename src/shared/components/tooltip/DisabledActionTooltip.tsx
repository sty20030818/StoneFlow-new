import * as React from 'react'

import { ActionTooltip } from './ActionTooltip'

type DisabledActionTooltipProps = {
	ariaLabel?: string
	children: React.ReactNode
	label: string
	reason: React.ReactNode
	shortcut?: React.ReactNode
}

function DisabledActionTooltip({
	ariaLabel,
	children,
	label,
	reason,
	shortcut,
}: DisabledActionTooltipProps) {
	return (
		<ActionTooltip>
			<ActionTooltip.Trigger asChild>
				<span
					aria-disabled='true'
					aria-label={ariaLabel ?? label}
					className='inline-flex max-w-full cursor-not-allowed'
					data-slot='disabled-action-tooltip-trigger'
					role='group'
					tabIndex={0}
				>
					{children}
				</span>
			</ActionTooltip.Trigger>
			<ActionTooltip.Content className='max-w-64'>
				<ActionTooltip.Row label={label} shortcut={shortcut} />
				<span className='px-1.5 pb-1 text-pretty text-muted-foreground'>{reason}</span>
			</ActionTooltip.Content>
		</ActionTooltip>
	)
}

export { DisabledActionTooltip }
