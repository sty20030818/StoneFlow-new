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
		<section
			aria-label='StoneFlow Quick Create'
			className={cn(
				'flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[13px] border border-sf-border-subtle bg-background',
				'shadow-[0_24px_56px_rgba(6,10,32,0.14),0_4px_14px_rgba(6,10,32,0.07)]',
			)}
		>
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
	)
}
