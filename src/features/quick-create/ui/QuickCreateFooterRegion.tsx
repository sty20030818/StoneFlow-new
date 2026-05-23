import { forwardRef, type ComponentProps } from 'react'

import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { cn } from '@/shared/lib/utils'

type QuickCreateFooterRegionProps = Omit<ComponentProps<'div'>, 'ref'>

export const QuickCreateFooterRegion = forwardRef<HTMLDivElement, QuickCreateFooterRegionProps>(
	function QuickCreateFooterRegion({ className, ...props }, ref) {
		return (
			<div {...props} className={cn('shrink-0', className)} ref={ref}>
				<QuickCreateFooter />
			</div>
		)
	},
)
