import type { ReactNode } from 'react'

import {
	createTaskPlacementGroupedDropdownProps,
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
	resolveTaskPlacementTarget,
	taskDateMetadataIcons,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project'
import { formatTaskPriorityLabel } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import type { AutosaveController } from '@/shared/autosave'

import { applyTaskPlacementDraftChange, type TaskDetailDraft } from '../model/taskDetailDraft'

type TaskPropertiesSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
	spaces: Array<{ id: string; name: string }>
	projects: ProjectOption[]
	disabled?: boolean
}

const READ_ONLY_REASON = '回收站中的任务为只读'

/** 任务属性的唯一编辑表面；抽屉与完整页只负责决定它出现在哪里。 */
export function TaskPropertiesSection({
	autosave,
	spaces,
	projects,
	disabled = false,
}: TaskPropertiesSectionProps) {
	const statusDropdownProps = createTaskStatusMetadataDropdownProps()
	const priorityDropdownProps = createTaskPriorityMetadataDropdownProps()
	const placementValue: TaskPlacementTarget = resolveTaskPlacementTarget({
		spaceId: autosave.draft.spaceId,
		projectId: autosave.draft.projectId,
	})
	const placementDropdownProps = createTaskPlacementGroupedDropdownProps({
		mode: 'global',
		currentSpaceId: autosave.draft.spaceId,
		spaces,
		projects,
	})

	return (
		<div className='flex flex-col gap-2' data-task-properties='stack'>
			<TaskPropertyRow label='状态'>
				<MetadataFieldDropdown
					buttonLabel={formatTaskStatusLabel(autosave.draft.status)}
					disabled={disabled}
					disabledReason={READ_ONLY_REASON}
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
			</TaskPropertyRow>

			<TaskPropertyRow label='优先级'>
				<MetadataFieldDropdown
					buttonLabel={formatTaskPriorityLabel(autosave.draft.priority)}
					disabled={disabled}
					disabledReason={READ_ONLY_REASON}
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
			</TaskPropertyRow>

			<TaskPropertyRow label='截止时间'>
				<MetadataDateDropdown
					disabled={disabled}
					disabledReason={READ_ONLY_REASON}
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
			</TaskPropertyRow>

			<TaskPropertyRow label='计划时间'>
				<MetadataDateDropdown
					disabled={disabled}
					disabledReason={READ_ONLY_REASON}
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
			</TaskPropertyRow>

			<TaskPropertyRow label='提醒时间'>
				<MetadataDateDropdown
					disabled={disabled}
					disabledReason={READ_ONLY_REASON}
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
			</TaskPropertyRow>

			<TaskPropertyRow label='归属'>
				<MetadataPlacementDropdown
					disabled={disabled}
					disabledReason={READ_ONLY_REASON}
					drawerOwnedOverlay
					groups={placementDropdownProps.groups}
					label='归属'
					menuLabel={placementDropdownProps.menuLabel}
					value={placementValue}
					onChange={(value: TaskPlacementTarget) =>
						autosave.setDraft((current) => applyTaskPlacementDraftChange(current, value), {
							saveMode: 'immediate',
						})
					}
				/>
			</TaskPropertyRow>
		</div>
	)
}

function TaskPropertyRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3'>
			<span className='text-[11px] font-medium text-muted'>{label}</span>
			<div className='min-w-0'>{children}</div>
		</div>
	)
}
