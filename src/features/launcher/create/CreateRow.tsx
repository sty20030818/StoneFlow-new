import { useLauncher } from '../domain/LauncherDomainProvider'
import { PriorityIcon } from '@/features/task'
import { TaskStatusIndicator } from '@/features/task'
import { RowShell } from '@/shared/components/row'
import { OverflowTooltip } from '@/shared/components/tooltip'

/**
 * 钉在 Results 上方的新建行：把当前草稿翻译为统一 RowShell。
 */
export function CreateRow() {
	const { actions, derived, state } = useLauncher()

	if (!derived.hasTitle) {
		return null
	}

	return (
		<div data-testid='launcher-create-section'>
			<RowShell.Root
				active={derived.isCreateFocused}
				aria-label={`创建任务 ${state.draft.title.trim()}`}
				className='border-transparent bg-sf-selection-surface hover:bg-sf-selection-surface-hover'
				interactive
				onClick={() => void actions.submit('create')}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						void actions.submit('create')
					}
				}}
				onMouseEnter={actions.focusCreate}
			>
				<RowShell.Left>
					<RowShell.Leading className='gap-1.5'>
						<TaskStatusIndicator status={state.draft.status} />
						<PriorityIcon priority={state.draft.priority} size='sm' />
					</RowShell.Leading>

					<RowShell.Title>
						<div className='min-w-0'>
							<OverflowTooltip
								className='text-[12.5px] text-foreground'
								content={state.draft.title.trim()}
							>
								{state.draft.title.trim()}
							</OverflowTooltip>
							<OverflowTooltip
								className='mt-0.5 text-[11px] text-sf-text-quaternary'
								content={derived.createMeta}
							>
								{derived.createMeta}
							</OverflowTooltip>
						</div>
					</RowShell.Title>
				</RowShell.Left>
			</RowShell.Root>
		</div>
	)
}
