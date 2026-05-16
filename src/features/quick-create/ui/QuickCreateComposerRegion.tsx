import type { ComponentProps } from 'react'

import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import { cn } from '@/shared/lib/utils'

export function QuickCreateComposerRegion({ className, ref, ...props }: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn('shrink-0', className)} ref={ref}>
			<QuickCreateComposer />
		</div>
	)
}
