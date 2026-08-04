import type { ReactNode } from 'react'
import { CalendarClockIcon, CalendarIcon, FolderIcon } from 'lucide-react'

import {
	PriorityIcon,
	TASK_PRIORITY_OPTIONS,
	TASK_STATUS_OPTIONS,
	TaskStatusIndicator,
} from '@/features/task/presentation'

import { FILTER_DATE_VALUE_VALUES, FILTER_PROJECT_NONE_VALUE, type FilterField } from '../core'
import { formatFilterValueLabel } from './filterLabels'

export type FilterValueOptionModel = {
	value: string
	label: string
	leading?: ReactNode
	count?: number
}

type FilterProjectOption = {
	id: string
	name: string
}

const STATUS_OPTIONS: FilterValueOptionModel[] = TASK_STATUS_OPTIONS.map((option) => ({
	value: option.value,
	label: option.label,
	leading: <TaskStatusIndicator status={option.value} />,
}))

const PRIORITY_OPTIONS: FilterValueOptionModel[] = TASK_PRIORITY_OPTIONS.map((option) => ({
	value: String(option.value),
	label: option.label,
	leading: <PriorityIcon priority={option.value} size='sm' />,
}))

const DATE_OPTIONS: FilterValueOptionModel[] = FILTER_DATE_VALUE_VALUES.map((value) => ({
	value,
	label: formatFilterValueLabel('due', value),
}))

const FIELD_LEADING: Record<FilterField, ReactNode> = {
	status: <TaskStatusIndicator status='todo' />,
	priority: <PriorityIcon priority={3} size='sm' />,
	project: <FolderIcon className='size-4 text-sf-text-tertiary' />,
	due: <CalendarIcon className='size-4 text-sf-text-tertiary' />,
	planned: <CalendarClockIcon className='size-4 text-sf-text-tertiary' />,
}

export function getFilterFieldLeading(field: FilterField): ReactNode {
	return FIELD_LEADING[field]
}

export function getFilterValueOptions(
	field: FilterField,
	projects?: readonly FilterProjectOption[],
): FilterValueOptionModel[] {
	switch (field) {
		case 'status':
			return STATUS_OPTIONS
		case 'priority':
			return PRIORITY_OPTIONS
		case 'due':
		case 'planned':
			return DATE_OPTIONS
		case 'project':
			return [
				{
					value: FILTER_PROJECT_NONE_VALUE,
					label: formatFilterValueLabel(field, FILTER_PROJECT_NONE_VALUE),
				},
				...(projects ?? []).map((project) => ({
					value: project.id,
					label: project.name,
				})),
			]
	}
}
