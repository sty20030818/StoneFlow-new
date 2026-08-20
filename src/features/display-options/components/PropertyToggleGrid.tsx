'use client'

import { ToggleButton } from '@heroui/react'

import { cn } from '@/shared/lib/utils'

type PropertyToggleItem = {
	key: string
	label: string
	checked: boolean
	disabled?: boolean
	onToggle: () => void
}

type PropertyToggleGridProps = {
	items: PropertyToggleItem[]
	className?: string
}

/**
 * Linear 式显示属性 pill：选中实心灰底，未选中描边。
 */
export function PropertyToggleGrid({ items, className }: PropertyToggleGridProps) {
	return (
		<div
			aria-label='显示属性'
			className={cn('flex flex-wrap items-center gap-1.5', className)}
			role='group'
		>
			{items.map((item) => (
				<ToggleButton
					isDisabled={item.disabled}
					isSelected={item.checked}
					key={item.key}
					onChange={item.onToggle}
					size='sm'
					variant='ghost'
				>
					{item.label}
				</ToggleButton>
			))}
		</div>
	)
}
