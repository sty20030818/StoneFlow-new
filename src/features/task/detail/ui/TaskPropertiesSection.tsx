import {
	createTaskPriorityMetadataOptions,
	createTaskStatusMetadataOptions,
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
	const statusOptions = createTaskStatusMetadataOptions()
	const priorityOptions = createTaskPriorityMetadataOptions()

	return (
		<div className='space-y-1' data-task-properties='stack'>
			<DetailFieldRow className='items-center' label='状态' labelClassName='pt-0'>
				<MetadataFieldDropdown
					buttonLabel={formatTaskStatusLabel(autosave.draft.status)}
					drawerOwnedOverlay
					label='状态'
					options={statusOptions}
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
					label='优先级'
					options={priorityOptions}
					value={autosave.draft.priority}
					onChange={(value) =>
						autosave.setField('priority', value, {
							saveMode: 'immediate',
						})
					}
				/>
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='截止' labelClassName='pt-0'>
				<MetadataDateDropdown
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.due}
					label='截止日期'
					value={autosave.draft.dueAt}
					onChange={(value) =>
						autosave.setField('dueAt', value ?? '', {
							saveMode: 'immediate',
						})
					}
				/>
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='计划' labelClassName='pt-0'>
				<MetadataDateDropdown
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.scheduled}
					label='计划日期'
					value={autosave.draft.scheduledAt}
					onChange={(value) =>
						autosave.setField('scheduledAt', value ?? '', {
							saveMode: 'immediate',
						})
					}
				/>
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='提醒' labelClassName='pt-0'>
				<MetadataDateDropdown
					drawerOwnedOverlay
					icon={taskDateMetadataIcons.reminder}
					label='提醒'
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
