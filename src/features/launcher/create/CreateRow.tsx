import { Button } from '@heroui/react'

import { useLauncher } from '../domain/LauncherDomainProvider'
import { PriorityIcon } from '@/features/task'
import { TaskStatusIndicator } from '@/features/task'
import { OverflowTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'

/** 钉在 Results 上方的新建动作；交互与语义由 HeroUI Button 承担。 */
export function CreateRow() {
	const { actions, derived, state } = useLauncher()

	if (!derived.hasTitle) {
		return null
	}

	return (
		<div data-testid='launcher-create-section'>
			<Button
				aria-label={`创建任务 ${state.draft.title.trim()}`}
				className={cn(
					'h-auto min-h-14 w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-left',
					derived.isCreateFocused && 'bg-accent-soft text-accent-soft-foreground',
				)}
				fullWidth
				onFocus={actions.focusCreate}
				onHoverStart={actions.focusCreate}
				onKeyDown={actions.handleKeyDown}
				onPress={() => void actions.submit('create')}
				type='button'
				variant='ghost'
			>
				<div className='flex min-w-0 flex-1 items-center gap-2.5'>
					<div className='flex shrink-0 items-center gap-1.5'>
						<TaskStatusIndicator status={state.draft.status} />
						<PriorityIcon priority={state.draft.priority} size='sm' />
					</div>

					<div className='min-w-0 flex-1'>
						<OverflowTooltip
							className='text-[12.5px] text-foreground'
							content={state.draft.title.trim()}
						>
							{state.draft.title.trim()}
						</OverflowTooltip>
						<OverflowTooltip className='mt-0.5 text-[11px] text-muted' content={derived.createMeta}>
							{derived.createMeta}
						</OverflowTooltip>
					</div>
				</div>
			</Button>
		</div>
	)
}
