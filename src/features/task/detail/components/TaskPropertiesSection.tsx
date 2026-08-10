import {
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	taskDateMetadataIcons,
} from '@/features/metadata-fields'
import type { AutosaveController } from '@/shared/autosave'
import { DetailFieldRow } from '@/shared/components/detail'
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
		<div className='space-y-2' data-task-properties='stack'>
			<DetailFieldRow className='items-center' label='状态' labelClassName='pt-0'>
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
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='优先级' labelClassName='pt-0'>
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
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='截止时间' labelClassName='pt-0'>
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
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='计划时间' labelClassName='pt-0'>
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
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='提醒时间' labelClassName='pt-0'>
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
			</DetailFieldRow>
		</div>
	)
}
