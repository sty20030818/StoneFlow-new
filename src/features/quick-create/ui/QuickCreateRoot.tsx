import { QuickCreateCreateRow } from '@/features/quick-create/ui/QuickCreateCreateRow'
import { QuickCreateAdvancedRow } from '@/features/quick-create/ui/QuickCreateAdvancedRow'
import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { QuickCreateInputRow } from '@/features/quick-create/ui/QuickCreateInputRow'
import { QuickCreateResults } from '@/features/quick-create/ui/QuickCreateResults'
import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { cn } from '@/shared/lib/utils'

export function QuickCreateRoot() {
	const { derived, state } = useQuickCreate()

	return (
		<div className={cn('relative flex h-full min-h-0 flex-1 bg-transparent')}>
			<section
				aria-label='StoneFlow Quick Create'
				className={cn(
					'relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-[0_0_28px_rgba(0,0,0,0.35)]',
				)}
				style={{ borderColor: '#bababa' }}
			>
				<div
					aria-hidden='true'
					className='pointer-events-none absolute inset-0 rounded-[14px]'
					style={{
						boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
					}}
				/>
				<QuickCreateInputRow />
				<QuickCreateAdvancedRow />
				{derived.continuousToastVisible ? (
					<div className='flex items-center gap-2 border-y border-sf-success-surface-border bg-sf-success-surface px-4 py-2 text-[11.5px] text-sf-success-surface-text'>
						<span className='rounded bg-background/65 px-1.5 py-0.5 font-mono text-[11px] font-semibold'>
							{state.continuousCreateCount}
						</span>
						<span>已连续创建 {state.continuousCreateCount} 条</span>
					</div>
				) : null}
				<QuickCreateCreateRow />
				<QuickCreateResults />
				<QuickCreateFooter />
			</section>
		</div>
	)
}
