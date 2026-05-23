import { type ReactNode } from 'react'

import { formatTaskPriorityLabel } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { formatShortDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'
import type { TaskListItem } from '@/shared/types'
import { Badge } from '@/shared/ui/base/badge'
import { CalendarIcon, CircleIcon, Link2Icon } from 'lucide-react'

import {
	taskPreviewCardClass,
	taskPreviewFooterClass,
	taskPreviewHeaderClass,
	taskPreviewHostClass,
	taskPreviewMetaRowClass,
	taskPreviewSectionClass,
} from './taskPreviewTokens'

type TaskPreviewProps = {
	task: TaskListItem | null
	linkSummary:
		| {
				items: Array<{ id: string; title: string }>
				remainingCount: number
		  }
		| null
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
	const dateItems = [
		task.dueAt ? { label: '截止', value: formatShortDate(task.dueAt) } : null,
		task.scheduledAt ? { label: '计划', value: formatShortDate(task.scheduledAt) } : null,
		task.reminderAt ? { label: '提醒', value: formatShortDate(task.reminderAt) } : null,
	].filter((item): item is { label: string; value: string } => item !== null)

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
					<div className='flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-sf-text-tertiary'>
						<span className='truncate'>{task.spaceName}</span>
						<span className='truncate text-right'>{placementLabel}</span>
					</div>
					<div className='flex flex-col gap-1.5'>
						<h2 className='line-clamp-2 text-[20px] font-semibold leading-[1.25] text-foreground'>
							{task.title}
						</h2>
						<div className={taskPreviewMetaRowClass}>
							<MetaPill icon={<StatusDot />} label={formatTaskStatusLabel(task.status)} />
							<MetaPill
								icon={<PriorityIcon className='text-sf-text-secondary' priority={task.priority} size='sm' />}
								label={formatTaskPriorityLabel(task.priority)}
							/>
							<MetaPill icon={<CalendarIcon className='size-3.5' />} label={buildDateSummary(dateItems)} />
						</div>
					</div>
				</header>

				{task.note ? (
					<section className={cn(taskPreviewSectionClass, 'pt-3')}>
						<h3 className='text-[11px] font-medium uppercase tracking-[0.16em] text-sf-text-tertiary'>
							备注
						</h3>
						<p className='line-clamp-5 text-[13px] leading-6 text-sf-text-secondary'>{task.note}</p>
					</section>
				) : null}

				{linkSummary && linkSummary.items.length > 0 ? (
					<section className={cn(taskPreviewSectionClass, task.note ? 'pt-4' : 'pt-3')}>
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

				<footer className={taskPreviewFooterClass}>
					<Badge className='rounded-full px-2 py-0.5 text-[11px]' variant='secondary'>
						{placementLabel}
					</Badge>
					<span className='truncate'>更新于 {formatUpdatedAt(task.updatedAt)}</span>
				</footer>
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

function buildDateSummary(items: Array<{ label: string; value: string }>) {
	if (items.length === 0) {
		return null
	}

	return items
		.map((item) => `${item.label}${item.value}`)
		.join(' · ')
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
