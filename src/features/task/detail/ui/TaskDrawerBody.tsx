import type { AutosaveController } from '@/shared/autosave'
import { DetailBody } from '@/shared/ui/detail'
import type { ProjectOption } from '@/features/project/model/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskLabelsSection } from './TaskLabelsSection'
import { TaskLinksSection } from './TaskLinksSection'
import { TaskNoteField } from './TaskNoteField'
import { TaskProjectSection } from './TaskProjectSection'
import { TaskPropertiesSection } from './TaskPropertiesSection'
import { TaskTitleField } from './TaskTitleField'

type TaskDrawerBodyProps = {
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
}

export function TaskDrawerBody({ autosave, projects }: TaskDrawerBodyProps) {
	return (
		<DetailBody viewportClassName='px-3 pt-2 pb-20'>
			<div className='flex flex-col' data-task-drawer-body='true'>
				<TaskTitleField autosave={autosave} />
				<TaskNoteField autosave={autosave} />
				{/* 属性块：状态、优先级、日期、项目、标签 */}
				<div className='mt-3 space-y-1 border-t border-sf-divider pt-3'>
					<TaskPropertiesSection autosave={autosave} />
					<TaskProjectSection autosave={autosave} projects={projects} />
					<TaskLabelsSection />
				</div>
				{/* 链接块 */}
				<div className='mt-3 border-t border-sf-divider pt-3'>
					<TaskLinksSection />
				</div>
			</div>
		</DetailBody>
	)
}
