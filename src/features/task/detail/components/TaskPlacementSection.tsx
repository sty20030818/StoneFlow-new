import {
	createTaskPlacementGroupedDropdownProps,
	MetadataPlacementDropdown,
	resolveTaskPlacementTarget,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project'
import type { AutosaveController } from '@/shared/autosave'

import { applyTaskPlacementDraftChange, type TaskDetailDraft } from '../model/taskDetailDraft'

type TaskPlacementSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
	spaces: Array<{ id: string; name: string }>
	projects: ProjectOption[]
	disabled?: boolean
	mode?: 'global'
}

export function TaskPlacementSection({
	autosave,
	spaces,
	projects,
	disabled = false,
	mode = 'global',
}: TaskPlacementSectionProps) {
	const currentValue: TaskPlacementTarget = resolveTaskPlacementTarget({
		spaceId: autosave.draft.spaceId,
		projectId: autosave.draft.projectId,
	})

	const dropdownProps = createTaskPlacementGroupedDropdownProps({
		mode,
		currentSpaceId: autosave.draft.spaceId,
		spaces,
		projects,
	})

	return (
		<div className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3'>
			<span className='text-xs font-medium text-muted'>归属</span>
			<MetadataPlacementDropdown
				disabled={disabled}
				disabledReason='回收站中的任务为只读'
				drawerOwnedOverlay
				groups={dropdownProps.groups}
				label='归属'
				menuLabel={dropdownProps.menuLabel}
				value={currentValue}
				onChange={(value: TaskPlacementTarget) =>
					autosave.setDraft((current) => applyTaskPlacementDraftChange(current, value), {
						saveMode: 'immediate',
					})
				}
			/>
		</div>
	)
}
