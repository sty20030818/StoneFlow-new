import type { AutosaveController } from '@/shared/autosave'
import { DetailPageStatusBlock, DetailSection } from '@/shared/ui/detail'
import type { TaskDetail } from '@/shared/types'
import type { ProjectOption } from '@/features/project/model/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskLabelsSection } from './TaskLabelsSection'
import { TaskProjectSection } from './TaskProjectSection'
import { TaskPropertiesSection } from './TaskPropertiesSection'

type TaskPageSidebarProps = {
	task: TaskDetail
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
	isReadOnly: boolean
}

export function TaskPageSidebar({ task, autosave, projects, isReadOnly }: TaskPageSidebarProps) {
	return (
		<div className='flex flex-col gap-3'>
			{task.archivedAt ? (
				<DetailPageStatusBlock>
					<p className='text-sm font-medium text-foreground'>已归档任务</p>
					<p className='mt-1 text-[12px] leading-5 text-sf-text-secondary'>
						该任务仍可查看，并可从页面恢复。
					</p>
				</DetailPageStatusBlock>
			) : null}

			{task.deletedAt ? (
				<DetailPageStatusBlock>
					<p className='text-sm font-medium text-foreground'>回收站中的任务</p>
					<p className='mt-1 text-[12px] leading-5 text-sf-text-secondary'>
						当前页面为只读，避免继续对已删除实体写入 autosave。
					</p>
				</DetailPageStatusBlock>
			) : null}

			<DetailSection
				className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4'
				description={isReadOnly ? '当前状态为只读展示。' : '结构化属性会立即或自动保存。'}
				title='Properties'
			>
				<TaskPropertiesSection autosave={autosave} disabled={isReadOnly} />
				<TaskProjectSection autosave={autosave} disabled={isReadOnly} projects={projects} />
				<TaskLabelsSection />
			</DetailSection>

			<DetailSection
				className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4'
				title='Meta'
			>
				<MetaRow label='Space' value={task.spaceName} />
				<MetaRow label='Project' value={task.projectName ?? '独立事项'} />
				<MetaRow label='Created' value={formatTimestamp(task.createdAt)} />
				<MetaRow label='Updated' value={formatTimestamp(task.updatedAt)} />
				{task.archivedAt ? (
					<MetaRow label='Archived' value={formatTimestamp(task.archivedAt)} />
				) : null}
				{task.deletedAt ? <MetaRow label='Trash' value={formatTimestamp(task.deletedAt)} /> : null}
			</DetailSection>
		</div>
	)
}

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-start justify-between gap-3 text-[12px] leading-5'>
			<span className='shrink-0 text-sf-text-tertiary'>{label}</span>
			<span className='min-w-0 text-right text-foreground'>{value}</span>
		</div>
	)
}

function formatTimestamp(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	}).format(date)
}
