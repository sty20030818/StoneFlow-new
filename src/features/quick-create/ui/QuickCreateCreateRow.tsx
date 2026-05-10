import { ArrowRightIcon, PlusIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { cn } from '@/shared/lib/utils'

export function QuickCreateCreateRow() {
	const { actions, derived, state } = useQuickCreate()

	if (!derived.hasTitle) {
		return null
	}

	return (
		<button
			aria-label={`创建任务 ${state.draft.title.trim()}`}
			className={cn(
				'relative flex items-center gap-3 border-y border-sf-border-interactive bg-primary/6 px-4 py-3 text-left transition-colors hover:bg-primary/8',
				derived.isCreateFocused ? 'shadow-[inset_3px_0_0_var(--color-primary)]' : '',
			)}
			onClick={() => void actions.submit('create')}
			onMouseEnter={actions.focusCreate}
			type='button'
		>
			<span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
				<PlusIcon className='size-4' />
			</span>
			<span className='min-w-0 flex-1'>
				<span className='block text-[10.5px] font-medium tracking-[0.06em] text-primary uppercase'>
					创建任务
				</span>
				<span className='mt-0.5 block truncate text-[13.5px] font-medium text-foreground'>
					{state.draft.title.trim()}
				</span>
				<span className='mt-1 block truncate text-[11px] text-sf-text-secondary'>{derived.createMeta}</span>
			</span>
			<span className='flex items-center gap-1 rounded-md border border-primary/20 bg-background/70 px-2 py-1 text-[11px] text-primary'>
				<span>↵</span>
				<span>{derived.enterLabel}</span>
				<ArrowRightIcon className='size-3.5' />
			</span>
		</button>
	)
}
