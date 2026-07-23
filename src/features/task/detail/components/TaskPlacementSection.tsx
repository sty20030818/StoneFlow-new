import {
	createTaskPlacementGroupedDropdownProps,
	MetadataPlacementDropdown,
	resolveTaskPlacementTarget,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project'
import type { AutosaveController } from '@/shared/autosave'
import { DetailFieldRow } from '@/shared/components/detail'

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
		<DetailFieldRow className='items-center' label='归属' labelClassName='pt-0'>
			<MetadataPlacementDropdown
				disabled={disabled}
				drawerOwnedOverlay
				groups={dropdownProps.groups}
				headerShortcut={dropdownProps.headerShortcut}
				label='归属'
				menuLabel={dropdownProps.menuLabel}
				value={currentValue}
				onChange={(value: TaskPlacementTarget) =>
					autosave.setDraft((current) => applyTaskPlacementDraftChange(current, value), {
						saveMode: 'immediate',
					})
				}
			/>
		</DetailFieldRow>
	)
}
