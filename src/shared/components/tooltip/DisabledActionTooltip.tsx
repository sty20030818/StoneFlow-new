import * as React from 'react'

import { ActionTooltip } from './ActionTooltip'

type DisabledActionTooltipProps = {
	children: React.ReactNode
	label: string
	reason: React.ReactNode
}

function DisabledActionTooltip({ children, label, reason }: DisabledActionTooltipProps) {
	return (
		<ActionTooltip>
			<ActionTooltip.Trigger asChild>
				<span
					aria-disabled='true'
					aria-label={label}
					className='inline-flex max-w-full cursor-not-allowed'
					data-slot='disabled-action-tooltip-trigger'
					role='group'
					tabIndex={0}
				>
					{children}
				</span>
			</ActionTooltip.Trigger>
			<ActionTooltip.Content>
				<div className='flex max-w-64 flex-col gap-1 px-1.5 py-1'>
					<span className='font-medium text-foreground'>{label}</span>
					<span className='text-pretty text-muted-foreground'>{reason}</span>
				</div>
			</ActionTooltip.Content>
		</ActionTooltip>
	)
}

export { DisabledActionTooltip }
