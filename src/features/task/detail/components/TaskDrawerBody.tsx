import type { AutosaveController } from '@/shared/autosave'
import { DetailBody } from '@/shared/components/detail'
import type { ProjectOption } from '@/features/project/model/types'
import type { Space } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskLabelsSection } from './TaskLabelsSection'
import { TaskLinksSection } from './TaskLinksSection'
import { TaskNoteField } from './TaskNoteField'
import { TaskPlacementSection } from './TaskPlacementSection'
import { TaskPropertiesSection } from './TaskPropertiesSection'
import { TaskTitleField } from './TaskTitleField'

type TaskDrawerBodyProps = {
	taskId: string
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
	spaces: Array<Pick<Space, 'id' | 'name'>>
}

export function TaskDrawerBody({ taskId, autosave, projects, spaces }: TaskDrawerBodyProps) {
	return (
		<DetailBody viewportClassName='px-3 pt-2 pb-20'>
			<div className='flex flex-col' data-task-drawer-body='true'>
				<TaskTitleField autosave={autosave} />
				<TaskNoteField autosave={autosave} />
				{/* 属性块：状态、优先级、日期、归属、标签 */}
				<div className='mt-3 space-y-2 border-t border-sf-divider pt-3'>
					<TaskPropertiesSection autosave={autosave} />
					<TaskPlacementSection autosave={autosave} projects={projects} spaces={spaces} />
					<TaskLabelsSection />
				</div>
				{/* 链接块 */}
				<div className='mt-3 border-t border-sf-divider pt-3'>
					<TaskLinksSection taskId={taskId} />
				</div>
			</div>
		</DetailBody>
	)
}
