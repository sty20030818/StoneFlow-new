import {
	Calendar1Icon,
	CalendarCogIcon,
	CalendarDaysIcon,
	CalendarIcon,
	CalendarOffIcon,
	CalendarX2Icon,
	FolderIcon,
	InboxIcon,
	OrbitIcon,
	TargetIcon,
} from 'lucide-react'

import type { TaskPriorityValue } from '@/features/task'
import { PriorityIcon } from '@/features/task'
import { TaskStatusIndicator } from '@/features/task'
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
		case 'folder':
			return <FolderIcon className='size-3.5 text-sf-icon-secondary' />
		case 'target':
			return <TargetIcon className='size-3.5 text-sf-icon-secondary' />
		case 'inbox':
			return <InboxIcon className='size-3.5 text-sf-icon-secondary' />
		case 'space':
			return <OrbitIcon className='size-3.5 text-sf-icon-secondary' />
		default:
			return <CalendarIcon className='size-3.5 text-sf-icon-secondary' />
	}
}
