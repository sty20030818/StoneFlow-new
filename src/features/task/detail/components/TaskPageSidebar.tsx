import { Alert, Card, Separator } from '@heroui/react'

import type { AutosaveController } from '@/shared/autosave'
import type { TaskDetail } from '@/shared/types'
import type { ProjectOption } from '@/features/project'
import type { Space } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
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
				<Alert>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>已归档任务</Alert.Title>
						<Alert.Description>该任务仍可查看，并可从页面恢复。</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}

			{task.deletedAt ? (
				<Alert status='warning'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>回收站中的任务</Alert.Title>
						<Alert.Description>该任务仅可查看；恢复后可继续编辑。</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}

			<Card>
				<Card.Header>
					<Card.Title>任务属性</Card.Title>
					<Card.Description>状态、时间与归属</Card.Description>
				</Card.Header>
				<Card.Content>
					<div className='flex flex-col gap-4'>
						<TaskPropertiesSection
							autosave={autosave}
							disabled={isReadOnly}
							projects={projects}
							spaces={spaces}
						/>
						<Separator variant='tertiary' />
						<section aria-labelledby={`task-system-details-${task.id}`}>
							<h3
								className='mb-2 text-xs font-semibold text-foreground'
								id={`task-system-details-${task.id}`}
							>
								记录信息
							</h3>
							<dl className='flex flex-col gap-2'>
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
							</dl>
						</section>
					</div>
				</Card.Content>
			</Card>
		</div>
	)
}

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-start justify-between gap-3 text-[12px] leading-5'>
			<dt className='shrink-0 text-muted'>{label}</dt>
			<dd className='min-w-0 text-right text-foreground'>{value}</dd>
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
