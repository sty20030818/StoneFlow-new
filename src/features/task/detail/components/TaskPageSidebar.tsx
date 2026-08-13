import type { AutosaveController } from '@/shared/autosave'
import { DetailPageStatusBlock, DetailSection } from '@/shared/components/detail'
import type { TaskDetail } from '@/shared/types'
import type { ProjectOption } from '@/features/project'
import type { Space } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPlacementSection } from './TaskPlacementSection'
import { TaskPropertiesSection } from './TaskPropertiesSection'

// 模块级 Intl 格式化器：避免每次调用都重建，格式选项固定不变
const timestampFormatter = new Intl.DateTimeFormat('zh-CN', {
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
})

type TaskPageSidebarProps = {
	task: TaskDetail
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
	spaces: Array<Pick<Space, 'id' | 'name'>>
	isReadOnly: boolean
}

export function TaskPageSidebar({
	task,
	autosave,
	projects,
	spaces,
	isReadOnly,
}: TaskPageSidebarProps) {
	return (
		<div className='flex flex-col gap-3'>
			{task.archivedAt ? (
				<DetailPageStatusBlock>
					<p className='text-sm font-medium text-legacy-foreground'>已归档任务</p>
					<p className='mt-1 text-[12px] leading-5 text-sf-text-secondary'>
						该任务仍可查看，并可从页面恢复。
					</p>
				</DetailPageStatusBlock>
			) : null}

			{task.deletedAt ? (
				<DetailPageStatusBlock>
					<p className='text-sm font-medium text-legacy-foreground'>回收站中的任务</p>
					<p className='mt-1 text-[12px] leading-5 text-sf-text-secondary'>
						当前页面为只读，避免继续对已删除实体写入 autosave。
					</p>
				</DetailPageStatusBlock>
			) : null}

			<DetailSection
				className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4'
				title='属性'
			>
				<TaskPropertiesSection autosave={autosave} disabled={isReadOnly} />
			</DetailSection>

			<DetailSection
				className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4'
				title='归属'
			>
				<TaskPlacementSection
					autosave={autosave}
					disabled={isReadOnly}
					projects={projects}
					spaces={spaces}
				/>
			</DetailSection>

			<DetailSection
				className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4'
				title='详情'
			>
				<MetaRow label='空间' value={task.spaceName} />
				<MetaRow label='项目' value={task.projectName ?? '独立事项'} />
				<MetaRow label='创建时间' value={formatTimestamp(task.createdAt)} />
				<MetaRow label='更新时间' value={formatTimestamp(task.updatedAt)} />
				{task.archivedAt ? (
					<MetaRow label='归档时间' value={formatTimestamp(task.archivedAt)} />
				) : null}
				{task.deletedAt ? (
					<MetaRow label='移入回收站时间' value={formatTimestamp(task.deletedAt)} />
				) : null}
			</DetailSection>
		</div>
	)
}

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-start justify-between gap-3 text-[12px] leading-5'>
			<span className='shrink-0 text-sf-text-tertiary'>{label}</span>
			<span className='min-w-0 text-right text-legacy-foreground'>{value}</span>
		</div>
	)
}

function formatTimestamp(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return timestampFormatter.format(date)
}
