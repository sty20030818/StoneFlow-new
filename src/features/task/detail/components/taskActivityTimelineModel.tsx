import type { ReactNode } from 'react'
import {
	ArchiveIcon,
	FolderIcon,
	Link2Icon,
	ListTodoIcon,
	NotebookPenIcon,
	Trash2Icon,
	TagIcon,
	Undo2Icon,
} from 'lucide-react'

import type { ActivityTimelineChange, ActivityTimelineEntry } from '@/features/activity'
import { taskDateMetadataIcons } from '@/features/metadata-fields'
import { getSpaceVisual } from '@/features/space'
import {
	formatTaskPriorityLabel,
	normalizeTaskPriorityValue,
} from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/model/indicators/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/model/indicators/TaskStatusIndicator'
import type { ProjectOption } from '@/features/project'
import type { Space, TaskStatus } from '@/shared/types'

type ActivityDisplayItem = {
	id: string
	icon: ReactNode
	text: string
	relativeTime: string
}

type BuildTaskActivityDisplayItemsOptions = {
	entries: ActivityTimelineEntry[]
	projects: ProjectOption[]
	spaces: Space[]
	limit?: number
}

type ActivityMetadataRecord = Record<string, unknown>

type PrimitiveActivityValue = string | number | boolean | null

const EMPTY_VALUE_LABEL = '空'

// 模块级 Intl 格式化器：避免每次调用都重建，格式选项固定不变
const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', {
	month: 'numeric',
	day: 'numeric',
})

export function buildTaskActivityDisplayItems({
	entries,
	projects,
	spaces,
	limit = 6,
}: BuildTaskActivityDisplayItemsOptions): ActivityDisplayItem[] {
	return entries
		.flatMap((entry) => buildTaskActivityDisplayItem(entry, projects, spaces))
		.slice(0, limit)
}

function buildTaskActivityDisplayItem(
	entry: ActivityTimelineEntry,
	projects: ProjectOption[],
	spaces: Space[],
): ActivityDisplayItem[] {
	const actorLabel = formatActorLabel(entry)
	const relativeTime = formatRelativeTime(entry.createdAt)
	const metadata = asActivityMetadataRecord(entry.metadata)

	switch (entry.action) {
		case 'task.created':
			return [
				{
					id: entry.id,
					icon: <ListTodoIcon className='size-4 text-sf-icon-secondary' />,
					text: `${actorLabel} 创建了任务`,
					relativeTime,
				},
			]
		case 'task.link.added':
			return [
				{
					id: entry.id,
					icon: <Link2Icon className='size-4 text-sf-icon-secondary' />,
					text: `${actorLabel} 添加了链接 ${formatQuotedText(metadata.title)}`,
					relativeTime,
				},
			]
		case 'task.link.updated':
			return [
				{
					id: entry.id,
					icon: <Link2Icon className='size-4 text-sf-icon-secondary' />,
					text: `${actorLabel} 更新了链接 ${formatQuotedText(metadata.title)}`,
					relativeTime,
				},
			]
		case 'task.link.removed':
			return [
				{
					id: entry.id,
					icon: <Link2Icon className='size-4 text-sf-icon-secondary' />,
					text: `${actorLabel} 移除了链接 ${formatQuotedText(metadata.title)}`,
					relativeTime,
				},
			]
		case 'task.archived':
			return [
				{
					id: entry.id,
					icon: <ArchiveIcon className='size-4 text-sf-icon-secondary' />,
					text: `${actorLabel} 归档了任务`,
					relativeTime,
				},
			]
		case 'task.restored':
			return [
				{
					id: entry.id,
					icon: <Undo2Icon className='size-4 text-sf-icon-secondary' />,
					text: `${actorLabel} 恢复了任务`,
					relativeTime,
				},
			]
		case 'task.deleted':
		case 'task.permanently_deleted':
			return [
				{
					id: entry.id,
					icon: <Trash2Icon className='size-4 text-sf-icon-secondary' />,
					text: `${actorLabel} 删除了任务`,
					relativeTime,
				},
			]
		default:
			break
	}

	const changeItems = entry.changes
		.map((change) =>
			buildFieldChangeActivityItem({
				entry,
				change,
				projects,
				spaces,
				actorLabel,
				relativeTime,
			}),
		)
		.filter((item): item is ActivityDisplayItem => item !== null)

	if (changeItems.length > 0) {
		return changeItems
	}

	return [
		{
			id: entry.id,
			icon: <NotebookPenIcon className='size-4 text-sf-icon-secondary' />,
			text: formatFallbackText(entry.summary, actorLabel),
			relativeTime,
		},
	]
}

function buildFieldChangeActivityItem({
	entry,
	change,
	projects,
	spaces,
	actorLabel,
	relativeTime,
}: {
	entry: ActivityTimelineEntry
	change: ActivityTimelineChange
	projects: ProjectOption[]
	spaces: Space[]
	actorLabel: string
	relativeTime: string
}): ActivityDisplayItem | null {
	switch (change.field) {
		case 'priority': {
			const nextPriority = normalizeTaskPriorityValue(asNumberValue(change.newValue))
			const prevLabel = formatTaskPriorityLabel(asNumberValue(change.oldValue))
			const nextLabel = formatTaskPriorityLabel(nextPriority)
			return {
				id: entry.id,
				icon: <PriorityIcon className='text-sf-icon-secondary' priority={nextPriority} size='md' />,
				text: `${actorLabel} 将优先级从 ${prevLabel} 调整为 ${nextLabel}`,
				relativeTime,
			}
		}
		case 'status': {
			const nextStatus = asTaskStatusValue(change.newValue) ?? 'todo'
			const prevLabel = formatTaskStatusLabel(asTaskStatusValue(change.oldValue) ?? 'todo')
			const nextLabel = formatTaskStatusLabel(nextStatus)
			return {
				id: entry.id,
				icon: <TaskStatusIndicator status={nextStatus} />,
				text: `${actorLabel} 将状态从 ${prevLabel} 调整为 ${nextLabel}`,
				relativeTime,
			}
		}
		case 'due_at':
			return buildDateFieldActivityItem(
				entry.id,
				actorLabel,
				relativeTime,
				'截止时间',
				change,
				taskDateMetadataIcons.due,
			)
		case 'scheduled_at':
			return buildDateFieldActivityItem(
				entry.id,
				actorLabel,
				relativeTime,
				'计划时间',
				change,
				taskDateMetadataIcons.scheduled,
			)
		case 'reminder_at':
			return buildDateFieldActivityItem(
				entry.id,
				actorLabel,
				relativeTime,
				'提醒时间',
				change,
				taskDateMetadataIcons.reminder,
			)
		case 'project_id': {
			const prevLabel = resolveProjectLabel(asStringValue(change.oldValue), projects)
			const nextLabel = resolveProjectLabel(asStringValue(change.newValue), projects)
			return {
				id: entry.id,
				icon: <FolderIcon className='size-4 text-sf-icon-secondary' />,
				text: buildAssignmentText(actorLabel, '项目', prevLabel, nextLabel),
				relativeTime,
			}
		}
		case 'space_id': {
			const nextSpace = spaces.find((space) => space.id === asStringValue(change.newValue)) ?? null
			const prevLabel = resolveSpaceLabel(asStringValue(change.oldValue), spaces)
			const nextLabel = resolveSpaceLabel(asStringValue(change.newValue), spaces)
			const SpaceIcon = nextSpace ? getSpaceVisual(nextSpace).icon : null
			const iconClassName = nextSpace
				? getSpaceVisual(nextSpace).iconClassName
				: 'text-sf-icon-secondary'
			return {
				id: entry.id,
				icon: SpaceIcon ? (
					<SpaceIcon className={`size-4 ${iconClassName}`} />
				) : (
					<TagIcon className='size-4 text-sf-icon-secondary' />
				),
				text: buildAssignmentText(actorLabel, '空间', prevLabel, nextLabel),
				relativeTime,
			}
		}
		case 'note':
			return {
				id: entry.id,
				icon: <NotebookPenIcon className='size-4 text-sf-icon-secondary' />,
				text: buildTextFieldActivityText(actorLabel, '备注', change),
				relativeTime,
			}
		case 'title':
			return {
				id: entry.id,
				icon: <NotebookPenIcon className='size-4 text-sf-icon-secondary' />,
				text: buildTextFieldActivityText(actorLabel, '标题', change),
				relativeTime,
			}
		case 'inbox_at':
			return null
		default:
			return null
	}
}

function buildDateFieldActivityItem(
	id: string,
	actorLabel: string,
	relativeTime: string,
	fieldLabel: string,
	change: ActivityTimelineChange,
	icon: ReactNode,
): ActivityDisplayItem {
	const prevValue = asStringValue(change.oldValue)
	const nextValue = asStringValue(change.newValue)

	if (!prevValue && nextValue) {
		return {
			id,
			icon,
			text: `${actorLabel} 添加了${fieldLabel} ${formatDateLabel(nextValue)}`,
			relativeTime,
		}
	}

	if (prevValue && !nextValue) {
		return {
			id,
			icon,
			text: `${actorLabel} 移除了${fieldLabel}`,
			relativeTime,
		}
	}

	return {
		id,
		icon,
		text: `${actorLabel} 将${fieldLabel}从 ${formatDateLabel(prevValue)} 调整为 ${formatDateLabel(nextValue)}`,
		relativeTime,
	}
}

function buildAssignmentText(
	actorLabel: string,
	fieldLabel: string,
	prevLabel: string,
	nextLabel: string,
) {
	if (
		(prevLabel === EMPTY_VALUE_LABEL || prevLabel === '独立事项') &&
		nextLabel !== EMPTY_VALUE_LABEL
	) {
		return `${actorLabel} 添加了${fieldLabel} ${nextLabel}`
	}

	if (
		prevLabel !== EMPTY_VALUE_LABEL &&
		prevLabel !== '独立事项' &&
		nextLabel === EMPTY_VALUE_LABEL
	) {
		return `${actorLabel} 移除了${fieldLabel}`
	}

	return `${actorLabel} 将${fieldLabel}从 ${prevLabel} 调整为 ${nextLabel}`
}

function buildTextFieldActivityText(
	actorLabel: string,
	fieldLabel: string,
	change: ActivityTimelineChange,
) {
	const prevLabel = formatPrimitiveValue(change.oldValue)
	const nextLabel = formatPrimitiveValue(change.newValue)

	if (prevLabel === EMPTY_VALUE_LABEL && nextLabel !== EMPTY_VALUE_LABEL) {
		return `${actorLabel} 添加了${fieldLabel}`
	}

	if (prevLabel !== EMPTY_VALUE_LABEL && nextLabel === EMPTY_VALUE_LABEL) {
		return `${actorLabel} 移除了${fieldLabel}`
	}

	return `${actorLabel} 更新了${fieldLabel}`
}
function resolveProjectLabel(projectId: string | null, projects: ProjectOption[]) {
	if (!projectId) {
		return '独立事项'
	}

	return projects.find((project) => project.id === projectId)?.name ?? projectId
}

function resolveSpaceLabel(spaceId: string | null, spaces: Space[]) {
	if (!spaceId) {
		return EMPTY_VALUE_LABEL
	}

	return spaces.find((space) => space.id === spaceId)?.name ?? spaceId
}

function formatFallbackText(summary: string | null, actorLabel: string) {
	if (!summary) {
		return `${actorLabel} 更新了任务`
	}

	return summary.startsWith(actorLabel) ? summary : `${actorLabel} ${summary}`
}

function formatActorLabel(entry: ActivityTimelineEntry) {
	switch (entry.actorType) {
		case 'system':
			return '系统'
		case 'ai':
			return 'AI'
		default:
			return '你'
	}
}

function formatRelativeTime(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	const diffMs = Date.now() - date.getTime()
	const minute = 60 * 1000
	const hour = 60 * minute
	const day = 24 * hour
	const week = 7 * day

	if (diffMs < hour) {
		const minutes = Math.max(1, Math.floor(diffMs / minute))
		return `${minutes} 分钟前`
	}

	if (diffMs < day) {
		const hours = Math.max(1, Math.floor(diffMs / hour))
		return `${hours} 小时前`
	}

	if (diffMs < week) {
		const days = Math.max(1, Math.floor(diffMs / day))
		return `${days} 天前`
	}

	const weeks = Math.max(1, Math.floor(diffMs / week))
	return `${weeks} 周前`
}

function formatDateLabel(value: string | null) {
	if (!value) {
		return EMPTY_VALUE_LABEL
	}

	const [year, month, day] = value.split('-')
	if (year && month && day) {
		return `${Number(month)} 月 ${Number(day)} 日`
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return shortDateFormatter.format(date)
}

function formatPrimitiveValue(value: unknown) {
	const primitive = asPrimitiveActivityValue(value)
	if (primitive === null || primitive === '') {
		return EMPTY_VALUE_LABEL
	}

	return String(primitive)
}

function asActivityMetadataRecord(value: unknown): ActivityMetadataRecord {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {}
	}

	return value as ActivityMetadataRecord
}

function asPrimitiveActivityValue(value: unknown): PrimitiveActivityValue {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value
	}

	return null
}

function asStringValue(value: unknown) {
	return typeof value === 'string' ? value : null
}

function asNumberValue(value: unknown) {
	return typeof value === 'number' ? value : null
}

function asTaskStatusValue(value: unknown): TaskStatus | null {
	return value === 'todo' ||
		value === 'doing' ||
		value === 'waiting' ||
		value === 'done' ||
		value === 'canceled'
		? value
		: null
}

function formatQuotedText(value: unknown) {
	const text = asStringValue(value)
	return text ? `「${text}」` : '「未命名链接」'
}
