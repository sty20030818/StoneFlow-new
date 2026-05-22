import {
	Calendar1Icon,
	CalendarCogIcon,
	CalendarDaysIcon,
	CalendarIcon,
	CalendarOffIcon,
	CalendarX2Icon,
} from 'lucide-react'

import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import type { TaskStatus } from '@/shared/types'

import type { MetadataActionIconKey } from './metadata-action-spec'

export function renderMetadataActionIcon(iconKey: MetadataActionIconKey | undefined) {
	if (!iconKey) {
		return null
	}

	switch (iconKey) {
		case 'status-todo':
		case 'status-doing':
		case 'status-waiting':
		case 'status-done':
		case 'status-canceled':
			return <TaskStatusIndicator status={iconKey.replace('status-', '') as TaskStatus} />
		case 'priority-0':
		case 'priority-1':
		case 'priority-2':
		case 'priority-3':
		case 'priority-4':
			return (
				<PriorityIcon
					priority={Number(iconKey.replace('priority-', '')) as TaskPriorityValue}
					size='md'
				/>
			)
		case 'calendar-off':
			return <CalendarOffIcon className='size-3.5 text-sf-icon-secondary' />
		case 'calendar-1':
			return <Calendar1Icon className='size-3.5 text-sf-icon-secondary' />
		case 'calendar-days':
			return <CalendarDaysIcon className='size-3.5 text-sf-icon-secondary' />
		case 'calendar-cog':
			return <CalendarCogIcon className='size-3.5 text-sf-icon-secondary' />
		case 'calendar-x-2':
			return <CalendarX2Icon className='size-3.5 text-sf-icon-secondary' />
		default:
			return <CalendarIcon className='size-3.5 text-sf-icon-secondary' />
	}
}
