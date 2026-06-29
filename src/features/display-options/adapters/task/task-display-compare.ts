import { compareAsc, compareDesc, differenceInCalendarDays, parseISO } from 'date-fns'

import type { TaskPriority } from '@/shared/types'
import type { TaskListItem } from '@/shared/types'

import type {
	ResolvedTaskDisplayOptions,
	TaskDisplayOrderDirection,
	TaskDisplayPageKey,
} from '@/features/display-options/core'

import type {
	TaskDateBucketKey,
	TaskDisplayComparatorContext,
	TaskDisplayStatusRank,
} from './task-display-types'

const STATUS_RANK: TaskDisplayStatusRank = {
	doing: 0,
	todo: 1,
	waiting: 2,
	done: 3,
	canceled: 4,
}

const SMART_URGENCY_RANK: Record<TaskDateBucketKey, number> = {
	overdue: 0,
	today: 1,
	tomorrow: 2,
	'this-week': 3,
	later: 4,
	none: 5,
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
	4: 0,
	3: 1,
	2: 2,
	1: 3,
	0: 4,
}

type CompareFn = (left: TaskListItem, right: TaskListItem) => number

export function createTaskDisplayComparator(
	options: ResolvedTaskDisplayOptions,
	context: TaskDisplayComparatorContext,
): CompareFn {
	switch (options.orderBy) {
		case 'smart':
			return (left, right) => compareBySmartOrder(left, right, context.pageKey)
		case 'manual':
			return compareByManualOrder
		case 'priority':
			return compareByPriority(options.orderDirection)
		case 'status':
			return compareByStatus(options.orderDirection)
		case 'dueAt':
			return compareByDateField('dueAt', options.orderDirection)
		case 'scheduledAt':
			return compareByDateField('scheduledAt', options.orderDirection)
		case 'inboxAt':
			return compareByDateField('inboxAt', options.orderDirection)
		case 'statusChangedAt':
			return compareByDateField('statusChangedAt', options.orderDirection)
		case 'createdAt':
			return compareByDateField('createdAt', options.orderDirection)
		case 'updatedAt':
			return compareByDateField('updatedAt', options.orderDirection)
		case 'completedAt':
			return compareByDateField('completedAt', options.orderDirection)
		case 'canceledAt':
			return compareByDateField('canceledAt', options.orderDirection)
		default:
			return compareBySmartOrder
	}
}

export function compareByManualOrder(left: TaskListItem, right: TaskListItem) {
	return (
		compareByDateValue(left.updatedAt, right.updatedAt, 'desc') || compareByStableId(left, right)
	)
}

export function compareBySmartOrder(
	left: TaskListItem,
	right: TaskListItem,
	pageKey?: TaskDisplayPageKey,
) {
	if (pageKey === 'task:completed') {
		return (
			compareByDateValue(left.completedAt, right.completedAt, 'desc') ||
			compareByStableId(left, right)
		)
	}

	if (pageKey === 'task:canceled') {
		return (
			compareByDateValue(left.canceledAt, right.canceledAt, 'desc') ||
			compareByStableId(left, right)
		)
	}

	const statusCompare = compareNumber(STATUS_RANK[left.status], STATUS_RANK[right.status], 'asc')
	if (statusCompare !== 0) {
		return statusCompare
	}

	const urgencyCompare = compareNumber(
		SMART_URGENCY_RANK[getTaskUrgencyBucket(left)],
		SMART_URGENCY_RANK[getTaskUrgencyBucket(right)],
		'asc',
	)
	if (urgencyCompare !== 0) {
		return urgencyCompare
	}

	const relevantDateCompare = compareRelevantDate(left, right)
	if (relevantDateCompare !== 0) {
		return relevantDateCompare
	}

	const priorityCompare = compareNumber(
		PRIORITY_RANK[left.priority],
		PRIORITY_RANK[right.priority],
		'asc',
	)
	if (priorityCompare !== 0) {
		return priorityCompare
	}

	return (
		compareByDateValue(left.updatedAt, right.updatedAt, 'desc') ||
		compareByDateValue(left.createdAt, right.createdAt, 'desc') ||
		compareByStableId(left, right)
	)
}

export function compareByPriority(direction: TaskDisplayOrderDirection): CompareFn {
	return (left, right) =>
		compareNumber(
			PRIORITY_RANK[left.priority],
			PRIORITY_RANK[right.priority],
			direction === 'asc' ? 'desc' : 'asc',
		) ||
		compareByDateValue(left.updatedAt, right.updatedAt, 'desc') ||
		compareByStableId(left, right)
}

export function compareByStatus(direction: TaskDisplayOrderDirection): CompareFn {
	return (left, right) =>
		compareNumber(STATUS_RANK[left.status], STATUS_RANK[right.status], direction) ||
		compareByDateValue(left.updatedAt, right.updatedAt, 'desc') ||
		compareByStableId(left, right)
}

export function compareByDateField(
	field: keyof Pick<
		TaskListItem,
		| 'dueAt'
		| 'scheduledAt'
		| 'inboxAt'
		| 'statusChangedAt'
		| 'createdAt'
		| 'updatedAt'
		| 'completedAt'
		| 'canceledAt'
	>,
	direction: TaskDisplayOrderDirection,
): CompareFn {
	return (left, right) =>
		compareByDateValue(left[field], right[field], direction) ||
		compareByDateValue(left.updatedAt, right.updatedAt, 'desc') ||
		compareByStableId(left, right)
}

export function getTaskUrgencyBucket(task: TaskListItem): TaskDateBucketKey {
	const relevantDate = task.dueAt ?? task.scheduledAt
	if (!relevantDate) {
		return 'none'
	}

	const diffDays = differenceInCalendarDays(parseISO(relevantDate), new Date())

	if (diffDays < 0) {
		return 'overdue'
	}

	if (diffDays === 0) {
		return 'today'
	}

	if (diffDays === 1) {
		return 'tomorrow'
	}

	if (diffDays <= 7) {
		return 'this-week'
	}

	return 'later'
}

function compareRelevantDate(left: TaskListItem, right: TaskListItem) {
	const leftRelevantDate = left.dueAt ?? left.scheduledAt
	const rightRelevantDate = right.dueAt ?? right.scheduledAt
	return compareByDateValue(leftRelevantDate, rightRelevantDate, 'asc')
}

function compareByDateValue(
	leftValue: string | null | undefined,
	rightValue: string | null | undefined,
	direction: TaskDisplayOrderDirection,
) {
	if (!leftValue && !rightValue) {
		return 0
	}

	if (!leftValue) {
		return 1
	}

	if (!rightValue) {
		return -1
	}

	const leftDate = parseISO(leftValue)
	const rightDate = parseISO(rightValue)
	return direction === 'asc' ? compareAsc(leftDate, rightDate) : compareDesc(leftDate, rightDate)
}

function compareNumber(left: number, right: number, direction: TaskDisplayOrderDirection) {
	if (left === right) {
		return 0
	}

	return direction === 'asc' ? left - right : right - left
}

function compareByStableId(left: TaskListItem, right: TaskListItem) {
	return left.id.localeCompare(right.id)
}
