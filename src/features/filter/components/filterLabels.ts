import type { FilterClause, FilterDateValue, FilterField, FilterOp } from '../core'
import { FILTER_PROJECT_NONE_VALUE } from '../core'

const STATUS_LABELS: Record<string, string> = {
	todo: '待执行',
	doing: '进行中',
	waiting: '等待中',
	done: '已完成',
	canceled: '已取消',
}

const PRIORITY_LABELS: Record<string, string> = {
	'0': '无优先级',
	'1': 'P1',
	'2': 'P2',
	'3': 'P3',
	'4': 'P4',
}

const DATE_LABELS: Record<FilterDateValue, string> = {
	today: '今天',
	tomorrow: '明天',
	thisWeek: '本周',
	overdue: '已逾期',
	hasDate: '有日期',
	noDate: '无日期',
}

const FIELD_LABELS: Record<FilterField, string> = {
	status: '状态',
	priority: '优先级',
	project: '项目',
	due: '截止时间',
	planned: '计划时间',
}

export function formatFilterFieldLabel(field: FilterField): string {
	return FIELD_LABELS[field]
}

export function formatFilterOpLabel(op: FilterOp, multi: boolean): string {
	if (op === 'is_not') {
		return multi ? '不是其中' : '不是'
	}
	return multi ? '是其中' : '是'
}

export function formatFilterValueLabel(
	field: FilterField,
	value: string,
	projects?: Array<{ id: string; name: string }>,
): string {
	switch (field) {
		case 'status':
			return STATUS_LABELS[value] ?? value
		case 'priority':
			return PRIORITY_LABELS[value] ?? `P${value}`
		case 'project':
			if (value === FILTER_PROJECT_NONE_VALUE) return '独立事项'
			return projects?.find((p) => p.id === value)?.name ?? value
		case 'due':
		case 'planned':
			return DATE_LABELS[value as FilterDateValue] ?? value
		default:
			return value
	}
}

export function formatClauseValuesSummary(
	clause: FilterClause,
	projects?: Array<{ id: string; name: string }>,
): string {
	return clause.values
		.map((value) => formatFilterValueLabel(clause.field, value, projects))
		.join('、')
}

export const FILTER_MENU_FIELDS: FilterField[] = ['status', 'priority', 'project', 'due', 'planned']

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
	value,
	label,
}))

export const PRIORITY_OPTIONS = ['4', '3', '2', '1', '0'].map((value) => ({
	value,
	label: PRIORITY_LABELS[value] ?? value,
}))

export const DATE_OPTIONS = (
	['today', 'tomorrow', 'thisWeek', 'overdue', 'hasDate', 'noDate'] as const
).map((value) => ({
	value,
	label: DATE_LABELS[value],
}))
