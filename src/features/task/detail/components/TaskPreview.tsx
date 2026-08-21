import { type ReactNode } from 'react'

import { Card, Separator, Surface } from '@heroui/react'

import { taskDateMetadataIcons } from '@/features/metadata-fields'
import { useTaskDetailData } from '@/features/task/hooks/useTaskData'
import { formatTaskPriorityLabel } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/model/indicators/PriorityIcon'
import { formatShortDate } from '@/shared/lib/date'
import { OverflowTooltip } from '@/shared/components/tooltip'
import type { TaskListItem } from '@/shared/types'
import { CircleIcon, Link2Icon } from 'lucide-react'

// 模块级 Intl 格式化器：避免每次调用都重建，格式选项固定不变
const updatedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
	month: 'numeric',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
})

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
	// 列表投影不含 note；预览正文走详情查询
	const detail = useTaskDetailData(task?.id)

	if (!task) {
		return null
	}

	const note = detail.item?.note ?? null
	const placementLabel = task.projectName ?? '独立事项'
	const breadcrumbLabel = `${task.spaceName} › ${placementLabel}`
	const dateItems: Array<{ icon: ReactNode; label: string }> = []

	if (task.dueAt) {
		dateItems.push({
			icon: taskDateMetadataIcons.due,
			label: `截止 ${formatShortDate(task.dueAt)}`,
		})
	}

	if (task.plannedAt) {
		dateItems.push({
			icon: taskDateMetadataIcons.scheduled,
			label: `计划 ${formatShortDate(task.plannedAt)}`,
		})
	}

	if (task.remindAt) {
		dateItems.push({
			icon: taskDateMetadataIcons.reminder,
			label: `提醒 ${formatShortDate(task.remindAt)}`,
		})
	}

	return (
		<div className='pointer-events-none absolute right-3 top-3 z-30 block sm:right-5 sm:top-5'>
			<Card
				aria-label='任务预览'
				className='pointer-events-auto w-[min(24rem,calc(100vw-8rem))] overflow-hidden'
				data-task-preview-root='true'
				onPointerEnter={onPointerEnter}
				onPointerLeave={onPointerLeave}
			>
				<Card.Header>
					<div className='flex flex-col gap-2'>
						<div className='flex items-center justify-between gap-3 text-[11px] leading-4 text-muted'>
							<OverflowTooltip className='min-w-0' content={breadcrumbLabel}>
								{breadcrumbLabel}
							</OverflowTooltip>
							<OverflowTooltip
								className='max-w-[45%] shrink-0 text-right'
								content={`更新于 ${formatUpdatedAt(task.updatedAt)}`}
							>
								更新于 {formatUpdatedAt(task.updatedAt)}
							</OverflowTooltip>
						</div>
						<div className='flex flex-col gap-1.5'>
							<Card.Title>
								<OverflowTooltip
									className='!line-clamp-2 !whitespace-normal text-[20px] font-semibold leading-tight text-foreground'
									content={task.title}
								>
									{task.title}
								</OverflowTooltip>
							</Card.Title>
							<div className='flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-4 text-muted'>
								<MetaPill icon={<StatusDot />} label={formatTaskStatusLabel(task.status)} />
								<MetaPill
									icon={<PriorityIcon className='text-muted' priority={task.priority} size='sm' />}
									label={formatTaskPriorityLabel(task.priority)}
								/>
								{dateItems.map((item) => (
									<MetaPill icon={item.icon} key={item.label} label={item.label} />
								))}
							</div>
						</div>
					</div>
				</Card.Header>

				<Separator variant='tertiary' />
				<Card.Content>
					<div className='flex flex-col gap-2'>
						{note ? (
							<p>
								<OverflowTooltip
									className='!line-clamp-5 !whitespace-normal text-[13px] leading-6 text-muted'
									content={note}
								>
									{note}
								</OverflowTooltip>
							</p>
						) : (
							<Surface variant='secondary'>
								<div className='p-3 text-xs leading-5 text-muted'>
									{detail.status === 'loading' ? '加载备注…' : '暂无备注'}
								</div>
							</Surface>
						)}
					</div>
				</Card.Content>

				{linkSummary && linkSummary.items.length > 0 ? (
					<>
						<Separator variant='tertiary' />
						<Card.Content>
							<div className='flex flex-col gap-2'>
								<h3 className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted'>
									链接
								</h3>
								<div className='flex flex-col gap-1.5'>
									{linkSummary.items.map((item) => (
										<div
											className='flex items-center gap-2 text-xs leading-5 text-muted'
											key={item.id}
										>
											<Link2Icon className='size-3.5 shrink-0' />
											<OverflowTooltip className='min-w-0' content={item.title}>
												{item.title}
											</OverflowTooltip>
										</div>
									))}
									{linkSummary.remainingCount > 0 ? (
										<span className='pl-5 text-[11px] text-muted'>
											另有 {linkSummary.remainingCount} 条
										</span>
									) : null}
								</div>
							</div>
						</Card.Content>
					</>
				) : null}
			</Card>
		</div>
	)
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string | null }) {
	if (!label) {
		return null
	}

	return (
		<span className='inline-flex min-w-0 items-center gap-1.5'>
			<span className='shrink-0 text-muted'>{icon}</span>
			<OverflowTooltip className='min-w-0' content={label}>
				{label}
			</OverflowTooltip>
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

	return updatedAtFormatter.format(date)
}
