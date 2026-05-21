import type { AutosaveController } from '@/shared/autosave'
import { DetailBody } from '@/shared/ui/detail'
import type { ProjectOption } from '@/features/project/model/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskLabelsSection } from './TaskLabelsSection'
import { TaskLinksSection } from './TaskLinksSection'
import { TaskNoteField } from './TaskNoteField'
import { TaskProjectSection } from './TaskProjectSection'
import { TaskPropertiesSection } from './TaskPropertiesSection'

type TaskDrawerBodyProps = {
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
}

export function TaskDrawerBody({ autosave, projects }: TaskDrawerBodyProps) {
	return (
		<DetailBody>
			<div className='flex flex-col gap-5 px-4 pt-4 pb-16' data-task-drawer-body='true'>
				<TaskNoteField autosave={autosave} />
				<TaskPropertiesSection autosave={autosave} />
				<TaskLabelsSection />
				<TaskProjectSection autosave={autosave} projects={projects} />
				<TaskLinksSection />
			</div>
		</DetailBody>
	)
}
