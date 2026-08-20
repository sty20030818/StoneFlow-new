import { Alert, Card } from '@heroui/react'

import type { AutosaveController } from '@/shared/autosave'
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
					<Card.Title>属性</Card.Title>
				</Card.Header>
				<Card.Content>
					<TaskPropertiesSection autosave={autosave} disabled={isReadOnly} />
				</Card.Content>
			</Card>

			<Card>
				<Card.Header>
					<Card.Title>归属</Card.Title>
				</Card.Header>
				<Card.Content>
					<TaskPlacementSection
						autosave={autosave}
						disabled={isReadOnly}
						projects={projects}
						spaces={spaces}
					/>
				</Card.Content>
			</Card>

			<Card>
				<Card.Header>
					<Card.Title>详情</Card.Title>
				</Card.Header>
				<Card.Content>
					<div className='flex flex-col gap-2'>
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
					</div>
				</Card.Content>
			</Card>
		</div>
	)
}

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-start justify-between gap-3 text-[12px] leading-5'>
			<span className='shrink-0 text-muted'>{label}</span>
			<span className='min-w-0 text-right text-foreground'>{value}</span>
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
