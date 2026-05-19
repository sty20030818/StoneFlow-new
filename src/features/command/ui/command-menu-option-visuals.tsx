import type { ReactNode } from 'react'

import {
	CalendarClockIcon,
	CalendarDaysIcon,
	CalendarIcon,
	CalendarX2Icon,
	FolderIcon,
	TargetIcon,
} from 'lucide-react'

import { TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import type { TaskStatus } from '@/shared/types'

export function getCommandMenuPriorityOptions() {
	return TASK_PRIORITY_OPTIONS.map((option) => ({
		...option,
		leading: <PriorityIcon priority={option.value} size='md' />,
	}))
}

export function getCommandMenuStatusOptions() {
	return TASK_STATUS_OPTIONS.map((option) => ({
		...option,
		leading: <TaskStatusIndicator status={option.value} />,
	}))
}

export function getCommandMenuPriorityLeading(priority: TaskPriorityValue) {
	return <PriorityIcon priority={priority} size='md' />
}

export function getCommandMenuStatusLeading(status: TaskStatus) {
	return <TaskStatusIndicator status={status} />
}

export function getCommandMenuDateLeading(key: string): ReactNode {
	switch (key) {
		case 'custom':
			return <CalendarClockIcon className='size-4 text-sf-icon-secondary' />
		case 'week':
		case 'thisWeek':
			return <CalendarDaysIcon className='size-4 text-sf-icon-secondary' />
		case 'none':
		case 'noDate':
			return <CalendarX2Icon className='size-4 text-sf-icon-secondary' />
		default:
			return <CalendarIcon className='size-4 text-sf-icon-secondary' />
	}
}

export function getCommandMenuPlacementLeading(kind: 'project' | 'no_project'): ReactNode {
	if (kind === 'no_project') {
		return <TargetIcon className='size-4 text-sf-icon-secondary' />
	}

	return <FolderIcon className='size-4 text-sf-icon-secondary' />
}
