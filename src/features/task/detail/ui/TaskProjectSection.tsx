import {
	createTaskPlacementMetadataOptions,
	MetadataPlacementDropdown,
	type MetadataPlacementValue,
} from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project/model/types'
import type { AutosaveController } from '@/shared/autosave'
import { DetailFieldRow } from '@/shared/ui/detail'

import {
	applyTaskProjectDraftChange,
	type TaskDetailDraft,
} from '../model/taskDetailDraft'

type TaskProjectSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
}

export function TaskProjectSection({ autosave, projects }: TaskProjectSectionProps) {
	const visibleProjects = autosave.draft.spaceId
		? projects.filter((project) => project.spaceId === autosave.draft.spaceId)
		: projects
	const placementOptions = createTaskPlacementMetadataOptions({
		projects: visibleProjects,
	})
	const currentValue: MetadataPlacementValue = autosave.draft.projectId
		? { kind: 'project', projectId: autosave.draft.projectId }
		: { kind: 'noProject' }

	return (
		<DetailFieldRow className='items-center' label='项目' labelClassName='pt-0'>
			<MetadataPlacementDropdown
				drawerOwnedOverlay
				label='项目'
				options={placementOptions}
				value={currentValue}
				onChange={(value) => {
					if (value.kind === 'project') {
						autosave.setDraft(
							(current) => applyTaskProjectDraftChange(current, value.projectId, projects),
							{ saveMode: 'immediate' },
						)
						return
					}

					autosave.setDraft(
						(current) => applyTaskProjectDraftChange(current, '', projects),
						{ saveMode: 'immediate' },
					)
				}}
			/>
		</DetailFieldRow>
	)
}
