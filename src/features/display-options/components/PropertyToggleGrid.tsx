'use client'

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
				<button
					aria-pressed={item.checked}
					className={cn(
						'h-7 rounded-full px-2.5 text-[12px] font-medium',
						item.checked
							? 'bg-legacy-muted text-legacy-foreground'
							: 'border border-legacy-border/80 bg-transparent text-sf-text-secondary hover:bg-legacy-muted/50',
						item.disabled && 'pointer-events-none opacity-50',
					)}
					disabled={item.disabled}
					key={item.key}
					onClick={item.onToggle}
					type='button'
				>
					{item.label}
				</button>
			))}
		</div>
	)
}
