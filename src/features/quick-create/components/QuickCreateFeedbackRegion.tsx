import type { ComponentProps } from 'react'

import { useQuickCreate } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import { cn } from '@/shared/lib/utils'

type QuickCreateFeedbackRegionProps = Omit<ComponentProps<'div'>, 'ref'>

export function QuickCreateFeedbackRegion({ className, ...props }: QuickCreateFeedbackRegionProps) {
	const { derived, state } = useQuickCreate()

	if (!derived.continuousToastVisible) {
		return null
	}

	return (
		<div
			{...props}
			className={cn(
				'shrink-0 flex items-center gap-2 border-b border-sf-success-surface-border bg-sf-success-surface px-4 py-2 text-[11.5px] text-sf-success-surface-text',
				className,
			)}
		>
			<span className='rounded bg-background/65 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums'>
				{state.continuousCreateCount}
			</span>
			<span>已连续创建 {state.continuousCreateCount} 条</span>
		</div>
	)
}
