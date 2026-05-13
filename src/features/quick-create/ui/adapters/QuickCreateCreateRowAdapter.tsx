import { formatDateLabel, useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import { RowShell } from '@/shared/ui/row'

/**
 * 创建动作行 adapter。
 * 把“按当前草稿创建任务”翻译为统一 row surface，而不是继续使用私有 button 行。
 */
export function QuickCreateCreateRowAdapter() {
	const { actions, derived, state } = useQuickCreate()

	if (!derived.hasTitle) {
		return null
	}

	return (
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
						<div className='truncate text-[12.5px] text-foreground'>{state.draft.title.trim()}</div>
						<div className='mt-0.5 truncate text-[11px] text-sf-text-quaternary'>
							{buildCreateRowMeta({
								spaceName: derived.spaceName,
								placementLabel: derived.placementLabel,
								dueAt: state.draft.dueAt,
								scheduledAt: state.draft.scheduledAt,
								reminderAt: state.draft.reminderAt,
							})}
						</div>
					</div>
				</RowShell.Title>
			</RowShell.Left>
		</RowShell.Root>
	)
}

function buildCreateRowMeta({
	spaceName,
	placementLabel,
	dueAt,
	scheduledAt,
	reminderAt,
}: {
	spaceName: string
	placementLabel: string
	dueAt: string | null
	scheduledAt: string | null
	reminderAt: string | null
}) {
	const parts = [`${spaceName} / ${placementLabel}`]

	if (dueAt) {
		parts.push(`截止 ${formatDateLabel(dueAt)}`)
	}
	if (scheduledAt) {
		parts.push(`计划 ${formatDateLabel(scheduledAt)}`)
	}
	if (reminderAt) {
		parts.push(`提醒 ${formatDateLabel(reminderAt)}`)
	}

	return parts.join(' · ')
}
