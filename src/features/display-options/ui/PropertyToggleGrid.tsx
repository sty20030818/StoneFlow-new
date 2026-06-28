'use client'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/base/badge'

type PropertyToggleItem = {
	key: string
	label: string
	description?: string
	checked: boolean
	disabled?: boolean
	onToggle: () => void
}

type PropertyToggleGridProps = {
	items: PropertyToggleItem[]
	className?: string
}

/**
 * 属性开关保持扁平的数据接口，避免把 visibleProperties 逻辑塞回面板组件。
 */
export function PropertyToggleGrid({ items, className }: PropertyToggleGridProps) {
	return (
		<div className={cn('grid gap-2 sm:grid-cols-2', className)}>
			{items.map((item) => (
				<button
					aria-pressed={item.checked}
					className={cn(
						'flex min-h-20 flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition-colors',
						item.checked
							? 'border-sf-border-interactive-active bg-sf-surface-interactive-active'
							: 'border-sf-border-subtle bg-muted/20 hover:bg-muted/40',
						item.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
					)}
					disabled={item.disabled}
					key={item.key}
					onClick={item.onToggle}
					type='button'
				>
					<div className='flex w-full items-center justify-between gap-2'>
						<span className='text-sm font-medium text-foreground'>{item.label}</span>
						<Badge variant={item.checked ? 'primary' : 'outline'}>
							{item.checked ? '显示' : '隐藏'}
						</Badge>
					</div>
					{item.description ? (
						<p className='text-[12px] leading-5 text-sf-shell-tertiary'>{item.description}</p>
					) : null}
				</button>
			))}
		</div>
	)
}
