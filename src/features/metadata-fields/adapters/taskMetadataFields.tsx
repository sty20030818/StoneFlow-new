import {
	CalendarClockIcon,
	CalendarX2Icon,
	BellIcon,
	FolderIcon,
	InboxIcon,
	TargetIcon,
} from 'lucide-react'

import type { ProjectOption } from '@/features/project/model/types'
import {
	formatTaskPriorityLabel,
	type TaskPriorityValue,
} from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import {
	createPriorityActionSpec,
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
	const options: MetadataPlacementOption[] = []

	if (includeInbox) {
		options.push({
			value: { kind: 'inbox' as const },
			label: '收件箱',
			icon: <InboxIcon className='size-3.5 text-sf-icon-secondary' />,
		})
	}

	options.push(
		{
			value: { kind: 'noProject' as const },
			label: '独立事项',
			icon: <TargetIcon className='size-3.5 text-sf-icon-secondary' />,
			isEmptyValue: true,
		},
		...projects.map((project) => ({
			value: { kind: 'project' as const, projectId: project.id },
			label: project.name,
			icon: <FolderIcon className='size-3.5 text-sf-icon-secondary' />,
		})),
	)

	return options
}

export const taskDateMetadataIcons = {
	due: <CalendarX2Icon className='size-3.5' />,
	scheduled: <CalendarClockIcon className='size-3.5' />,
	reminder: <BellIcon className='size-3.5' />,
} as const

export { formatTaskPriorityLabel, formatTaskStatusLabel }
