import type { ReactNode } from 'react'
import { Chip } from '@heroui/react'

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
		<Chip
			aria-label={ariaLabel}
			className={cn('shrink-0', compact ? 'max-w-45' : 'max-w-52', className)}
			size='sm'
			variant='secondary'
		>
			{icon}
			<Chip.Label className='min-w-0'>
				<OverflowTooltip className='min-w-0' content={label}>
					{label}
				</OverflowTooltip>
			</Chip.Label>
		</Chip>
	)
}
