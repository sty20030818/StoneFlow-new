import * as React from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/base/tooltip'
import { cn } from '@/shared/lib/utils'

type ActionTooltipRowProps = {
	label: React.ReactNode
	shortcut?: React.ReactNode
}

function ActionTooltipRoot(props: React.ComponentProps<typeof Tooltip>) {
	return <Tooltip {...props} />
}

function ActionTooltipTrigger(props: React.ComponentProps<typeof TooltipTrigger>) {
	return <TooltipTrigger {...props} />
}

function ActionTooltipContent({
	className,
	...props
}: React.ComponentProps<typeof TooltipContent>) {
	return (
		<TooltipContent
			className={cn('inline-flex flex-col items-stretch gap-0.5 p-1.5', className)}
			{...props}
		/>
	)
}

function ActionTooltipRow({ label, shortcut }: ActionTooltipRowProps) {
	return (
		<div
			className='flex min-h-6 items-center justify-between gap-4 rounded-md px-1.5 py-0.5'
			data-slot='action-tooltip-row'
		>
			<span className='min-w-0 text-pretty'>{label}</span>
			{shortcut === undefined ? null : (
				<span className='shrink-0' data-slot='action-tooltip-shortcut'>
					{shortcut}
				</span>
			)}
		</div>
	)
}

const ActionTooltip = Object.assign(ActionTooltipRoot, {
	Content: ActionTooltipContent,
	Row: ActionTooltipRow,
	Trigger: ActionTooltipTrigger,
})

export { ActionTooltip }
export type { ActionTooltipRowProps }
