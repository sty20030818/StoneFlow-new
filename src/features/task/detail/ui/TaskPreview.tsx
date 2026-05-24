import { type ReactNode } from 'react'

import { taskDateMetadataIcons } from '@/features/metadata-fields'
import { formatTaskPriorityLabel } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { formatShortDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'
import type { TaskListItem } from '@/shared/types'
import { CircleIcon, Link2Icon } from 'lucide-react'

import {
	taskPreviewCardClass,
	taskPreviewHeaderClass,
	taskPreviewHostClass,
	taskPreviewMetaRowClass,
	taskPreviewSectionClass,
} from './taskPreviewTokens'

type TaskPreviewProps = {
	task: TaskListItem | null
	linkSummary: {
		items: Array<{ id: string; title: string }>
		remainingCount: number
	} | null
	onPointerEnter: () => void
	onPointerLeave: () => void
}

export function TaskPreview({
	task,
	linkSummary,
	onPointerEnter,
	onPointerLeave,
}: TaskPreviewProps) {
	if (!task) {
		return null
	}

	const placementLabel = task.projectName ?? (task.inboxAt ? 'Inbox' : '独立事项')
	const breadcrumbLabel = `${task.spaceName} > ${placementLabel}`
	const dateItems: Array<{ icon: ReactNode; label: string }> = []

	if (task.dueAt) {
		dateItems.push({
			icon: taskDateMetadataIcons.due,
			label: `截止 ${formatShortDate(task.dueAt)}`,
		})
	}

	if (task.scheduledAt) {
		dateItems.push({
			icon: taskDateMetadataIcons.scheduled,
			label: `计划 ${formatShortDate(task.scheduledAt)}`,
		})
	}

	if (task.reminderAt) {
		dateItems.push({
			icon: taskDateMetadataIcons.reminder,
			label: `提醒 ${formatShortDate(task.reminderAt)}`,
		})
	}

	return (
		<div className={taskPreviewHostClass}>
			<section
				aria-label='任务预览'
				className={taskPreviewCardClass}
				data-task-preview-root='true'
				onPointerEnter={onPointerEnter}
				onPointerLeave={onPointerLeave}
			>
				<header className={taskPreviewHeaderClass}>
					<div className='flex items-center justify-between gap-3 text-[11px] leading-4 text-sf-text-tertiary'>
						<span className='min-w-0 truncate'>{breadcrumbLabel}</span>
						<span className='shrink-0 truncate text-right'>
							更新于 {formatUpdatedAt(task.updatedAt)}
						</span>
					</div>
					<div className='flex flex-col gap-1.5'>
						<h2 className='line-clamp-2 text-[20px] font-semibold leading-[1.25] text-foreground'>
							{task.title}
						</h2>
						<div className={taskPreviewMetaRowClass}>
							<MetaPill icon={<StatusDot />} label={formatTaskStatusLabel(task.status)} />
							<MetaPill
								icon={
									<PriorityIcon
										className='text-sf-text-secondary'
										priority={task.priority}
										size='sm'
									/>
								}
								label={formatTaskPriorityLabel(task.priority)}
							/>
							{dateItems.map((item) => (
								<MetaPill icon={item.icon} key={item.label} label={item.label} />
							))}
						</div>
					</div>
				</header>

				<section className={cn(taskPreviewSectionClass, 'pt-3')}>
					{task.note ? (
						<p className='line-clamp-5 text-[13px] leading-6 text-sf-text-secondary'>{task.note}</p>
					) : (
						<div className='rounded-md border border-dashed border-sf-border-subtle bg-muted/30 px-3 py-3 text-[12px] leading-5 text-sf-text-tertiary'>
							暂无备注
						</div>
					)}
				</section>

				{linkSummary && linkSummary.items.length > 0 ? (
					<section className={cn(taskPreviewSectionClass, 'pt-4')}>
						<h3 className='text-[11px] font-medium uppercase tracking-[0.16em] text-sf-text-tertiary'>
							链接
						</h3>
						<div className='flex flex-col gap-1.5'>
							{linkSummary.items.map((item) => (
								<div
									className='flex items-center gap-2 text-[12px] leading-5 text-sf-text-secondary'
									key={item.id}
								>
									<Link2Icon className='size-3.5 shrink-0 text-sf-text-tertiary' />
									<span className='truncate'>{item.title}</span>
								</div>
							))}
							{linkSummary.remainingCount > 0 ? (
								<span className='pl-5 text-[11px] text-sf-text-tertiary'>
									+{linkSummary.remainingCount} more
								</span>
							) : null}
						</div>
					</section>
				) : null}
			</section>
		</div>
	)
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string | null }) {
	if (!label) {
		return null
	}

	return (
		<span className='inline-flex min-w-0 items-center gap-1.5'>
			<span className='shrink-0 text-sf-text-tertiary'>{icon}</span>
			<span className='truncate'>{label}</span>
		</span>
	)
}

function StatusDot() {
	return <CircleIcon className='size-3' />
}

function formatUpdatedAt(value: string) {
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
