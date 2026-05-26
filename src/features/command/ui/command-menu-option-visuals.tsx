import type { ReactNode } from 'react'

import {
	Calendar1Icon,
	CalendarCogIcon,
	CalendarDaysIcon,
	CalendarIcon,
	CalendarOffIcon,
	FolderIcon,
	TargetIcon,
} from 'lucide-react'

import {
	createPriorityActionSpec,
	createStatusActionSpec,
	type MetadataActionIconKey,
} from '@/features/metadata-fields/core'
import type { TaskStatus } from '@/shared/types'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'

import { mapMetadataActionSpecToCommandMenuGroup } from './command-menu-metadata'

export function getCommandMenuPriorityOptions() {
	return mapMetadataActionSpecToCommandMenuGroup(createPriorityActionSpec()).options
}

export function getCommandMenuStatusOptions() {
	return mapMetadataActionSpecToCommandMenuGroup(createStatusActionSpec()).options
}

export function getCommandMenuPriorityLeading(priority: TaskPriorityValue) {
	return mapMetadataIconToCommandLeading(`priority-${priority}`)
}

export function getCommandMenuStatusLeading(status: TaskStatus) {
	return mapMetadataIconToCommandLeading(`status-${status}`)
}

export function mapMetadataIconToCommandLeading(iconKey: MetadataActionIconKey | string) {
	switch (iconKey) {
		case 'calendar-cog':
		case 'custom':
			return <CalendarCogIcon className='size-4 text-sf-icon-secondary' />
		case 'calendar-1':
		case 'today':
			return <Calendar1Icon className='size-4 text-sf-icon-secondary' />
		case 'calendar-days':
		case 'one-week':
		case 'this-week':
		case 'thisWeek':
			return <CalendarDaysIcon className='size-4 text-sf-icon-secondary' />
		case 'calendar-off':
		case 'none':
		case 'noDate':
			return <CalendarOffIcon className='size-4 text-sf-icon-secondary' />
		default:
			return <CalendarIcon className='size-4 text-sf-icon-secondary' />
	}
}

export function getCommandMenuDateLeading(key: string) {
	switch (key) {
		case 'custom':
			return mapMetadataIconToCommandLeading('calendar-cog')
		case 'today':
			return mapMetadataIconToCommandLeading('calendar-1')
		case 'one-week':
		case 'this-week':
		case 'thisWeek':
			return mapMetadataIconToCommandLeading('calendar-days')
		case 'none':
		case 'noDate':
			return mapMetadataIconToCommandLeading('calendar-off')
		default:
			return mapMetadataIconToCommandLeading('calendar')
	}
}

export function getCommandMenuPlacementLeading(kind: 'project' | 'no_project' | 'inbox'): ReactNode {
	if (kind !== 'project') {
		return <TargetIcon className='size-4 text-sf-icon-secondary' />
	}

	return <FolderIcon className='size-4 text-sf-icon-secondary' />
}
