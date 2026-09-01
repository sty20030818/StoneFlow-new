import * as React from 'react'
import { Tooltip } from '@heroui/react'

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
		<Tooltip closeDelay={0} delay={500}>
			<Tooltip.Trigger
				aria-disabled='true'
				aria-label={ariaLabel ?? label}
				className='inline-flex max-w-full cursor-not-allowed'
				data-slot='disabled-action-tooltip-trigger'
				role='group'
				tabIndex={0}
			>
				{children}
			</Tooltip.Trigger>
			<Tooltip.Content className='max-w-64' placement='bottom'>
				<div className='flex flex-col gap-0.5'>
					<ActionTooltip.Row label={label} shortcut={shortcut} />
					{reason ? (
						<span
							className='px-1.5 pb-1 text-pretty text-muted'
							data-slot='disabled-action-tooltip-reason'
						>
							{reason}
						</span>
					) : null}
				</div>
			</Tooltip.Content>
		</Tooltip>
	)
}

export { DisabledActionTooltip }
