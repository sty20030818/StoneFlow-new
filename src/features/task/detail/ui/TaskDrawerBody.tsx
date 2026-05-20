import type { AutosaveController } from '@/shared/autosave'
import { DetailBody, DetailSection } from '@/shared/ui/detail'
import type { ProjectOption } from '@/features/project/model/types'
import type { Space, TaskDetail } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskNoteField } from './TaskNoteField'
import { TaskProjectSection } from './TaskProjectSection'
import { TaskPropertiesSection } from './TaskPropertiesSection'
import { TaskTitleField } from './TaskTitleField'

type TaskDrawerBodyProps = {
	autosave: AutosaveController<TaskDetailDraft>
	task: TaskDetail
	projects: ProjectOption[]
	spaces: Space[]
}

export function TaskDrawerBody({ autosave, task, projects, spaces }: TaskDrawerBodyProps) {
	return (
		<DetailBody>
			<div className='flex flex-col gap-4 p-4'>
				<DetailSection>
					<div className='flex flex-col gap-3'>
						<TaskTitleField autosave={autosave} />
						<TaskNoteField autosave={autosave} />
					</div>
				</DetailSection>

				<TaskPropertiesSection autosave={autosave} />
				<TaskProjectSection autosave={autosave} projects={projects} spaces={spaces} />

				<DetailSection title='信息'>
					<div className='flex flex-col gap-1 border-t border-sf-divider pt-3'>
						<ReadonlyMetaRow label='创建于' value={formatDate(task.createdAt)} />
						<ReadonlyMetaRow label='更新于' value={formatDate(task.updatedAt)} />
					</div>
				</DetailSection>
			</div>
		</DetailBody>
	)
}

function ReadonlyMetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-center justify-between gap-3 text-[12px] leading-5 text-sf-text-tertiary'>
			<span>{label}</span>
			<span className='truncate text-sf-text-secondary'>{value}</span>
		</div>
	)
}

function formatDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	}).format(date)
}
