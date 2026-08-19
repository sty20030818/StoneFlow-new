import {
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	taskDateMetadataIcons,
} from '@/features/metadata-fields'
import type { AutosaveController } from '@/shared/autosave'
import { formatTaskPriorityLabel } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskPropertiesSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
	disabled?: boolean
}

export function TaskPropertiesSection({ autosave, disabled = false }: TaskPropertiesSectionProps) {
	const statusDropdownProps = createTaskStatusMetadataDropdownProps()
	const priorityDropdownProps = createTaskPriorityMetadataDropdownProps()

	return (
		<div className='flex flex-col gap-2' data-task-properties='stack'>
			<div className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3'>
				<span className='text-xs font-medium text-muted'>状态</span>
				<MetadataFieldDropdown
					buttonLabel={formatTaskStatusLabel(autosave.draft.status)}
					disabled={disabled}
					disabledReason='回收站中的任务为只读'
					drawerOwnedOverlay
					fieldKey='status'
					label='状态'
					menuLabel={statusDropdownProps.menuLabel}
					options={statusDropdownProps.options}
					value={autosave.draft.status}
					onChange={(value) =>
						autosave.setField('status', value, {
							saveMode: 'immediate',
						})
					}
				/>
			</div>

			<div className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3'>
				<span className='text-xs font-medium text-muted'>优先级</span>
				<MetadataFieldDropdown
					buttonLabel={formatTaskPriorityLabel(autosave.draft.priority)}
					disabled={disabled}
					disabledReason='回收站中的任务为只读'
					drawerOwnedOverlay
					fieldKey='priority'
					label='优先级'
					menuLabel={priorityDropdownProps.menuLabel}
					options={priorityDropdownProps.options}
					value={autosave.draft.priority}
					onChange={(value) =>
						autosave.setField('priority', value, {
							saveMode: 'immediate',
						})
					}
				/>
			</div>

			<div className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3'>
				<span className='text-xs font-medium text-muted'>截止时间</span>
				<MetadataDateDropdown
					disabled={disabled}
					disabledReason='回收站中的任务为只读'
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.due}
					label='截止时间'
					value={autosave.draft.dueAt}
					onChange={(value) =>
						autosave.setField('dueAt', value ?? '', {
							saveMode: 'immediate',
						})
					}
				/>
			</div>

			<div className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3'>
				<span className='text-xs font-medium text-muted'>计划时间</span>
				<MetadataDateDropdown
					disabled={disabled}
					disabledReason='回收站中的任务为只读'
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.scheduled}
					label='计划时间'
					value={autosave.draft.plannedAt}
					onChange={(value) =>
						autosave.setField('plannedAt', value ?? '', {
							saveMode: 'immediate',
						})
					}
				/>
			</div>

			<div className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3'>
				<span className='text-xs font-medium text-muted'>提醒时间</span>
				<MetadataDateDropdown
					disabled={disabled}
					disabledReason='回收站中的任务为只读'
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.reminder}
					label='提醒时间'
					value={autosave.draft.remindAt}
					onChange={(value) =>
						autosave.setField('remindAt', value ?? '', {
							saveMode: 'immediate',
						})
					}
				/>
			</div>
		</div>
	)
}
