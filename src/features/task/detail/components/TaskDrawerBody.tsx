import type { Ref } from 'react'

import { ScrollShadow } from '@heroui/react'

import type { AutosaveController } from '@/shared/autosave'
import type { ProjectOption } from '@/features/project'
import type { Space } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
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
	scrollRef?: Ref<HTMLDivElement>
}

export function TaskDrawerBody({
	taskId,
	autosave,
	projects,
	spaces,
	scrollRef,
}: TaskDrawerBodyProps) {
	return (
		<ScrollShadow
			className='min-h-0 flex-1 px-3 pt-2 pb-20'
			data-scroll-container='true'
			ref={scrollRef}
		>
			<div className='flex flex-col' data-task-detail-body='true'>
				<TaskTitleField autosave={autosave} />
				<TaskNoteField autosave={autosave} />
				{/* 属性块：状态、优先级、日期、归属 */}
				<div className='mt-3 space-y-2 border-t border-separator pt-3'>
					<TaskPropertiesSection autosave={autosave} />
					<TaskPlacementSection autosave={autosave} projects={projects} spaces={spaces} />
				</div>
				{/* 链接块 */}
				<div className='mt-3 border-t border-separator pt-3'>
					<TaskLinksSection taskId={taskId} />
				</div>
			</div>
		</ScrollShadow>
	)
}
