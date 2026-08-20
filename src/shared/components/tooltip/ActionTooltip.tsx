import * as React from 'react'
import { Tooltip } from '@heroui/react'
import { mergeProps, mergeRefs } from '@react-aria/utils'

type ActionTooltipRowProps = {
	label: React.ReactNode
	shortcut?: React.ReactNode
}

type ActionTooltipProps = Omit<React.ComponentProps<typeof Tooltip>, 'children'> &
	ActionTooltipRowProps & {
		children: React.ReactElement<Record<string, unknown>>
	}

function ActionTooltipRoot({
	children,
	closeDelay = 0,
	delay = 500,
	label,
	shortcut,
	...props
}: ActionTooltipProps) {
	return (
		<Tooltip closeDelay={closeDelay} delay={delay} {...props}>
			<Tooltip.Trigger
				render={(triggerProps) => {
					const mergedProps = mergeProps(triggerProps, children.props) as Record<string, unknown>
					mergedProps.ref = mergeRefs(
						triggerProps.ref as React.Ref<HTMLElement>,
						children.props.ref as React.Ref<HTMLElement> | undefined,
					)
					if (children.props.role === undefined) delete mergedProps.role
					if (children.props.tabIndex === undefined) delete mergedProps.tabIndex
					if (children.props['data-slot'] === undefined) delete mergedProps['data-slot']

					return React.cloneElement(children, mergedProps)
				}}
			/>
			<Tooltip.Content placement='bottom'>
				<ActionTooltipRow label={label} shortcut={shortcut} />
			</Tooltip.Content>
		</Tooltip>
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
	Row: ActionTooltipRow,
})

export { ActionTooltip }
