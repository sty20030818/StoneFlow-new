import {
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	formatTaskPriorityLabel,
	formatTaskStatusLabel,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	taskDateMetadataIcons,
} from '@/features/metadata-fields'
import type { AutosaveController } from '@/shared/autosave'
import { DetailFieldRow } from '@/shared/ui/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskPropertiesSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
}

export function TaskPropertiesSection({ autosave }: TaskPropertiesSectionProps) {
	const statusDropdownProps = createTaskStatusMetadataDropdownProps()
	const priorityDropdownProps = createTaskPriorityMetadataDropdownProps()

	return (
		<div className='space-y-2' data-task-properties='stack'>
			<DetailFieldRow className='items-center' label='状态' labelClassName='pt-0'>
				<MetadataFieldDropdown
					buttonLabel={formatTaskStatusLabel(autosave.draft.status)}
					drawerOwnedOverlay
					fieldKey='status'
					headerShortcut={statusDropdownProps.headerShortcut}
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
					drawerOwnedOverlay
					fieldKey='priority'
					headerShortcut={priorityDropdownProps.headerShortcut}
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
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.scheduled}
					label='计划时间'
					value={autosave.draft.scheduledAt}
					onChange={(value) =>
						autosave.setField('scheduledAt', value ?? '', {
							saveMode: 'immediate',
						})
					}
				/>
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='提醒时间' labelClassName='pt-0'>
				<MetadataDateDropdown
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.reminder}
					label='提醒时间'
					value={autosave.draft.reminderAt}
					onChange={(value) =>
						autosave.setField('reminderAt', value ?? '', {
							saveMode: 'immediate',
						})
					}
				/>
			</DetailFieldRow>
		</div>
	)
}
