import { QuickCreateActionBoard } from '@/features/quick-create/ui/QuickCreateActionBoard'
import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { QuickCreateSurface } from '@/features/quick-create/ui/QuickCreateSurface'
import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { cn } from '@/shared/lib/utils'

export function QuickCreateRoot() {
	const { derived, state } = useQuickCreate()

	if (state.isBootstrapping) {
		return <div className='flex h-full min-h-0 flex-1 bg-transparent' />
	}

	return (
		<div className={cn('relative flex h-full min-h-0 flex-1 bg-transparent')}>
			<QuickCreateSurface>
				<QuickCreateComposer />
				{derived.continuousToastVisible ? (
					<div className='flex items-center gap-2 border-y border-sf-success-surface-border bg-sf-success-surface px-4 py-2 text-[11.5px] text-sf-success-surface-text'>
						<span className='rounded bg-background/65 px-1.5 py-0.5 font-mono text-[11px] font-semibold'>
							{state.continuousCreateCount}
						</span>
						<span>已连续创建 {state.continuousCreateCount} 条</span>
					</div>
				) : null}
				<QuickCreateActionBoard />
				<QuickCreateFooter />
			</QuickCreateSurface>
		</div>
	)
}
