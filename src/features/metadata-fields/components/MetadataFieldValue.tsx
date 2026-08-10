import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { OverflowTooltip } from '@/shared/components/tooltip'

export type MetadataFieldValueProps = {
	icon?: ReactNode
	label: ReactNode
	ariaLabel?: string
	compact?: boolean
	className?: string
}

/**
 * 只读元数据值。外观与字段控件同组，但不伪装成可点击按钮。
 */
export function MetadataFieldValue({
	icon,
	label,
	ariaLabel,
	compact = false,
	className,
}: MetadataFieldValueProps) {
	return (
		<span
			aria-label={ariaLabel}
			className={cn(
				'inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full border border-sf-border-interactive bg-sf-surface-interactive px-2.5 text-[0.8rem] leading-none font-medium whitespace-nowrap text-sf-text-interactive shadow-(--sf-shadow-interactive) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
				compact ? 'max-w-45' : 'max-w-52',
				className,
			)}
		>
			{icon}
			<OverflowTooltip className='min-w-0' content={label}>
				{label}
			</OverflowTooltip>
		</span>
	)
}
