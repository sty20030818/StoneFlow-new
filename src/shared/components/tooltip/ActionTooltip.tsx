import * as React from 'react'
import { Tooltip } from '@heroui/react'
import { mergeProps, mergeRefs } from '@react-aria/utils'
import { useHover } from 'react-aria/useHover'
import { TooltipTriggerStateContext } from 'react-aria-components/Tooltip'

type ActionTooltipRowProps = {
	label: React.ReactNode
	shortcut?: React.ReactNode
}

type ActionTooltipProps = Omit<React.ComponentProps<typeof Tooltip>, 'children' | 'trigger'> &
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
		<Tooltip closeDelay={closeDelay} delay={delay} {...props} isDisabled>
			<ActionTooltipTrigger isDisabled={props.isDisabled}>{children}</ActionTooltipTrigger>
			<Tooltip.Content data-react-aria-top-layer placement='bottom'>
				<ActionTooltipRow label={label} shortcut={shortcut} />
			</Tooltip.Content>
		</Tooltip>
	)
}

function ActionTooltipTrigger({
	children,
	isDisabled,
}: Pick<ActionTooltipProps, 'children' | 'isDisabled'>) {
	// 只由悬停驱动 HeroUI 的同一份延迟状态；Root 禁用自动 focus，不阻止按钮聚焦。
	const state = React.use(TooltipTriggerStateContext)!
	const { hoverProps } = useHover({
		isDisabled,
		onHoverStart: () => state.open(),
		onHoverEnd: () => state.close(),
	})

	return (
		<Tooltip.Trigger
			render={(triggerProps) => {
				const mergedProps = mergeProps(
					{
						// HeroUI Button 会再次包装键盘事件；提示层不消费按键，子控件仍可自行处理。
						onKeyDown: (
							event: React.KeyboardEvent<HTMLElement> & { continuePropagation?: () => void },
						) => event.continuePropagation?.(),
					},
					triggerProps,
					hoverProps,
					children.props,
				) as Record<string, unknown>
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
	)
}

function ActionTooltipRow({ label, shortcut }: ActionTooltipRowProps) {
	return (
		<div className='flex items-center justify-between gap-2' data-slot='action-tooltip-row'>
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
