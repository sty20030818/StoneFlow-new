import {
	createSpaceMetadataDropdownProps,
	getSpaceMetadataButtonVisual,
	MetadataFieldDropdown,
} from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project/model/types'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import type { AutosaveController } from '@/shared/autosave'
import { DetailFieldRow } from '@/shared/ui/detail'

import { applyTaskSpaceDraftChange, type TaskDetailDraft } from '../model/taskDetailDraft'

type TaskSpaceSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
	disabled?: boolean
}

export function TaskSpaceSection({
	autosave,
	projects,
	disabled = false,
}: TaskSpaceSectionProps) {
	const spaces = useSpaceStore(selectSpaces)
	const currentSpace = spaces.find((space) => space.id === autosave.draft.spaceId) ?? null
	const buttonVisual = getSpaceMetadataButtonVisual(currentSpace)
	const dropdownProps = createSpaceMetadataDropdownProps(spaces)

	return (
		<DetailFieldRow className='items-center' label='空间' labelClassName='pt-0'>
			<MetadataFieldDropdown
				buttonIcon={buttonVisual.icon}
				buttonLabel={buttonVisual.label}
				disabled={disabled}
				drawerOwnedOverlay
				fieldKey='space'
				headerShortcut={dropdownProps.headerShortcut}
				label='空间'
				menuLabel={dropdownProps.menuLabel}
				options={dropdownProps.options}
				value={autosave.draft.spaceId}
				onChange={(value) =>
					autosave.setDraft(
						(current) => applyTaskSpaceDraftChange(current, value, projects),
						{ saveMode: 'immediate' },
					)
				}
			/>
		</DetailFieldRow>
	)
}
