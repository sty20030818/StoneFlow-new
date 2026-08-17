import * as React from 'react'
import { Tooltip } from '@heroui/react'
import { mergeRefs } from '@react-aria/utils'

import { cn } from '@/shared/lib/utils'

type OverflowTooltipProps = {
	children: React.ReactNode
	className?: string
	content: React.ReactNode
}

function isElementOverflowing(element: HTMLElement) {
	return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
}

function OverflowTooltip({ children, className, content }: OverflowTooltipProps) {
	const triggerRef = React.useRef<HTMLSpanElement>(null)
	const [isOpen, setIsOpen] = React.useState(false)

	const measureOverflow = React.useCallback(() => {
		const trigger = triggerRef.current
		const nextIsOverflowing = trigger ? isElementOverflowing(trigger) : false

		if (!nextIsOverflowing) {
			setIsOpen(false)
		}

		return nextIsOverflowing
	}, [])

	React.useLayoutEffect(() => {
		const trigger = triggerRef.current
		if (!trigger) {
			return
		}

		measureOverflow()
		if (typeof ResizeObserver === 'undefined') {
			return
		}

		const observer = new ResizeObserver(measureOverflow)
		observer.observe(trigger)

		return () => observer.disconnect()
	}, [children, measureOverflow])

	return (
		<Tooltip
			closeDelay={0}
			delay={500}
			isOpen={isOpen}
			onOpenChange={(nextIsOpen) => {
				setIsOpen(nextIsOpen && measureOverflow())
			}}
		>
			<Tooltip.Trigger
				className={cn('block min-w-0 max-w-full truncate', className)}
				data-slot='overflow-tooltip-trigger'
				onPointerEnter={measureOverflow}
				role='group'
				render={(triggerProps) => (
					<span
						{...triggerProps}
						ref={mergeRefs(triggerProps.ref, triggerRef)}
						tabIndex={undefined}
					>
						{children}
					</span>
				)}
			/>
			<Tooltip.Content placement='bottom'>{content}</Tooltip.Content>
		</Tooltip>
	)
}

export { OverflowTooltip }
