'use client'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'

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
 * 显示属性保持轻量 toggle 语义，不再额外承载说明卡片。
 */
export function PropertyToggleGrid({ items, className }: PropertyToggleGridProps) {
	return (
		<div
			aria-label='显示属性'
			className={cn('flex flex-wrap items-center gap-2', className)}
			role='group'
		>
			{items.map((item) => (
				<Button
					aria-pressed={item.checked}
					className={cn(
						'h-8 rounded-full px-3',
						item.checked ? undefined : 'text-sf-text-secondary',
					)}
					disabled={item.disabled}
					key={item.key}
					onClick={item.onToggle}
					size='sm'
					type='button'
					variant={item.checked ? 'outline' : 'ghost'}
				>
					{item.label}
				</Button>
			))}
		</div>
	)
}
