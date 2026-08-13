import { CheckIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

type SelectionIndicatorProps = {
	checked: boolean
	disabled?: boolean
	className?: string
}

/** 复合控件内的纯勾选标记；交互语义必须由外层控件持有。 */
export function SelectionIndicator({ checked, disabled, className }: SelectionIndicatorProps) {
	return (
		<span
			aria-hidden
			className={cn(
				'flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
				checked
					? 'border-primary bg-primary text-primary-foreground'
					: 'border-sf-border-strong bg-transparent text-transparent group-hover/selection-indicator:border-sf-icon-secondary',
				disabled && 'opacity-40',
				className,
			)}
			data-checked={checked}
			data-slot='selection-indicator'
		>
			<CheckIcon className='size-3' strokeWidth={2.5} />
		</span>
	)
}
