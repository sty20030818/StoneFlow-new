import { forwardRef, type ComponentProps } from 'react'

import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import { cn } from '@/shared/lib/utils'

type QuickCreateComposerRegionProps = Omit<ComponentProps<'div'>, 'ref'>

export const QuickCreateComposerRegion = forwardRef<HTMLDivElement, QuickCreateComposerRegionProps>(
	function QuickCreateComposerRegion({ className, ...props }, ref) {
		return (
			<div {...props} className={cn('shrink-0', className)} ref={ref}>
				<QuickCreateComposer />
			</div>
		)
	},
)
