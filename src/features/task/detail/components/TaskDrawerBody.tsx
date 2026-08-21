import type { Ref } from 'react'

import { ScrollShadow, Separator } from '@heroui/react'

import type { AutosaveController } from '@/shared/autosave'
import type { ProjectOption } from '@/features/project'
import type { Space } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskLinksSection } from './TaskLinksSection'
import { TaskNoteField } from './TaskNoteField'
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
		<ScrollShadow className='min-h-0 flex-1 px-3 py-3' data-scroll-container='true' ref={scrollRef}>
			<div className='flex flex-col gap-4' data-task-detail-body='true'>
				<div className='flex flex-col gap-2'>
					<TaskTitleField autosave={autosave} />
					<TaskNoteField autosave={autosave} />
				</div>
				<Separator variant='tertiary' />
				<section aria-labelledby={`task-properties-${taskId}`} className='flex flex-col gap-2.5'>
					<h3 className='text-xs font-semibold text-foreground' id={`task-properties-${taskId}`}>
						属性
					</h3>
					<TaskPropertiesSection autosave={autosave} projects={projects} spaces={spaces} />
				</section>
				<Separator variant='tertiary' />
				<div>
					<TaskLinksSection taskId={taskId} />
				</div>
			</div>
		</ScrollShadow>
	)
}
