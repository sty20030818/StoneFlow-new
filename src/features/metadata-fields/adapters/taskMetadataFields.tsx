import { CalendarClockIcon, CalendarX2Icon, BellIcon } from 'lucide-react'

import type { ProjectOption } from '@/features/project/model/types'
import { formatTaskPriorityLabel, type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import {
	createPriorityActionSpec,
	createPlacementActionSpec,
	createStatusActionSpec,
	mapMetadataActionSpecToDropdownProps,
	type MetadataDropdownMappedProps,
	type MetadataFieldOption,
	type MetadataPlacementOption,
} from '@/features/metadata-fields/core'
import type { TaskStatus } from '@/shared/types'

export function createTaskStatusMetadataDropdownProps(): MetadataDropdownMappedProps<TaskStatus> {
	return mapMetadataActionSpecToDropdownProps(createStatusActionSpec())
}

export function createTaskStatusMetadataOptions(): Array<MetadataFieldOption<TaskStatus>> {
	return createTaskStatusMetadataDropdownProps().options
}

export function createTaskPriorityMetadataDropdownProps(): MetadataDropdownMappedProps<TaskPriorityValue> {
	return mapMetadataActionSpecToDropdownProps(createPriorityActionSpec())
}

export function createTaskPriorityMetadataOptions(): Array<MetadataFieldOption<TaskPriorityValue>> {
	return createTaskPriorityMetadataDropdownProps().options
}

export function createTaskPlacementMetadataOptions({
	projects,
	includeInbox = false,
}: {
	projects: Array<Pick<ProjectOption, 'id' | 'name'>>
	includeInbox?: boolean
}): MetadataPlacementOption[] {
	return createTaskPlacementMetadataDropdownProps({
		projects,
		includeInbox,
	}).options
}

export function createTaskPlacementMetadataDropdownProps({
	projects,
	includeInbox = false,
}: {
	projects: Array<Pick<ProjectOption, 'id' | 'name'>>
	includeInbox?: boolean
}): MetadataDropdownMappedProps<MetadataPlacementOption['value']> {
	return mapMetadataActionSpecToDropdownProps(
		createPlacementActionSpec({
			projects,
			includeInbox,
			labelMode: 'project',
		}),
	)
}

export const taskDateMetadataIcons = {
	due: <CalendarX2Icon className='size-3.5' />,
	scheduled: <CalendarClockIcon className='size-3.5' />,
	reminder: <BellIcon className='size-3.5' />,
} as const

export { formatTaskPriorityLabel, formatTaskStatusLabel }
