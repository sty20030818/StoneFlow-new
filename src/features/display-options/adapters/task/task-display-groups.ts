import { differenceInCalendarDays, isThisWeek, parseISO } from 'date-fns'

import { formatTaskPriorityLabel } from '@/features/task'
import { formatTaskStatusLabel } from '@/features/task'
import type { TaskListItem } from '@/shared/types'

import type { ResolvedTaskDisplayOptions } from '@/features/display-options/core'

import { createTaskDisplayComparator } from './task-display-compare'
import type {
	TaskDateBucketKey,
	TaskDisplayApplyContext,
	TaskDisplayGroupDescriptor,
	TaskDisplaySection,
	TaskGroupDefinition,
} from './task-display-types'

export function buildTaskDisplaySections(
	items: TaskListItem[],
	options: ResolvedTaskDisplayOptions,
	context: TaskDisplayApplyContext,
): TaskDisplaySection[] {
	if (options.groupBy === 'none') {
		return [
			{
				key: 'all',
				label: '全部任务',
				tasks: sortTasks(items, options, context),
			},
		]
	}

	const descriptor = getTaskDisplayGroupDescriptor(
		items,
		options.groupBy,
		context.includeEmptySections ?? false,
	)
	const compare = createTaskDisplayComparator(options, { pageKey: context.pageKey })

	return descriptor.groups
		.map((group) => {
			const groupTasks = items
				.filter((task) => resolveTaskGroupValue(task, options.groupBy) === group.value)
				.sort(compare)

			if (groupTasks.length === 0 && !(context.includeEmptySections ?? false)) {
				return null
			}

			return {
				key: group.key,
				label: group.label,
				tasks: groupTasks,
			}
		})
		.filter((section): section is TaskDisplaySection => section !== null)
}

export function getTaskDisplayGroupDescriptor(
	items: TaskListItem[],
	groupBy: ResolvedTaskDisplayOptions['groupBy'],
	includeEmpty: boolean,
): TaskDisplayGroupDescriptor {
	switch (groupBy) {
		case 'status':
			return {
				groupBy,
				groups: [
					{ key: 'status:doing', label: formatTaskStatusLabel('doing'), value: 'doing' },
					{ key: 'status:todo', label: formatTaskStatusLabel('todo'), value: 'todo' },
					{ key: 'status:waiting', label: formatTaskStatusLabel('waiting'), value: 'waiting' },
					{ key: 'status:done', label: formatTaskStatusLabel('done'), value: 'done' },
					{ key: 'status:canceled', label: formatTaskStatusLabel('canceled'), value: 'canceled' },
				],
			}
		case 'priority':
			return {
				groupBy,
				groups: [
					{ key: 'priority:4', label: formatTaskPriorityLabel(4), value: '4' },
					{ key: 'priority:3', label: formatTaskPriorityLabel(3), value: '3' },
					{ key: 'priority:2', label: formatTaskPriorityLabel(2), value: '2' },
					{ key: 'priority:1', label: formatTaskPriorityLabel(1), value: '1' },
					{ key: 'priority:0', label: formatTaskPriorityLabel(0), value: '0' },
				],
			}
		case 'project':
			return {
				groupBy,
				groups: buildProjectGroups(items, includeEmpty),
			}
		case 'due':
		case 'scheduled':
			return {
				groupBy,
				groups: [
					{ key: `${groupBy}:overdue`, label: '已过期', value: 'overdue' },
					{ key: `${groupBy}:today`, label: '今天', value: 'today' },
					{ key: `${groupBy}:tomorrow`, label: '明天', value: 'tomorrow' },
					{ key: `${groupBy}:this-week`, label: '本周', value: 'this-week' },
					{ key: `${groupBy}:later`, label: '更晚', value: 'later' },
					{ key: `${groupBy}:none`, label: '未设置', value: 'none' },
				],
			}
		case 'none':
		default:
			return {
				groupBy: 'none',
				groups: [{ key: 'all', label: '全部任务', value: 'all' }],
			}
	}
}

export function resolveTaskGroupValue(
	task: TaskListItem,
	groupBy: ResolvedTaskDisplayOptions['groupBy'],
): string {
	switch (groupBy) {
		case 'status':
			return task.status
		case 'priority':
			return String(task.priority)
		case 'project':
			return task.projectId ?? '__none__'
		case 'due':
			return resolveTaskDateBucket(task.dueAt)
		case 'scheduled':
			return resolveTaskDateBucket(task.plannedAt)
		case 'none':
		default:
			return 'all'
	}
}

export function resolveTaskDateBucket(value: string | null): TaskDateBucketKey {
	if (!value) {
		return 'none'
	}

	const date = parseISO(value)
	const diffDays = differenceInCalendarDays(date, new Date())

	if (diffDays < 0) {
		return 'overdue'
	}

	if (diffDays === 0) {
		return 'today'
	}

	if (diffDays === 1) {
		return 'tomorrow'
	}

	if (isThisWeek(date, { weekStartsOn: 1 })) {
		return 'this-week'
	}

	return 'later'
}

function sortTasks(
	items: TaskListItem[],
	options: ResolvedTaskDisplayOptions,
	context: TaskDisplayApplyContext,
) {
	return items.toSorted(createTaskDisplayComparator(options, { pageKey: context.pageKey }))
}

function buildProjectGroups(items: TaskListItem[], includeEmpty: boolean): TaskGroupDefinition[] {
	const namedProjects = new Map<string, string>()

	for (const task of items) {
		if (task.projectId && task.projectName) {
			namedProjects.set(task.projectId, task.projectName)
		}
	}

	const groups = [...namedProjects.entries()]
		.toSorted((left, right) => left[1].localeCompare(right[1]))
		.map(([projectId, projectName]) => ({
			key: `project:${projectId}`,
			label: projectName,
			value: projectId,
		}))

	if (includeEmpty || items.some((task) => task.projectId === null)) {
		groups.push({
			key: 'project:none',
			label: '未归属项目',
			value: '__none__',
		})
	}

	return groups
}
