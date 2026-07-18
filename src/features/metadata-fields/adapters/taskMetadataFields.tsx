import { CalendarClockIcon, CalendarX2Icon, BellIcon } from 'lucide-react'

import type { TaskPriorityValue } from '@/features/task'
import {
	buildTaskPlacementGroups,
	createPriorityActionSpec,
	createStatusActionSpec,
	mapMetadataActionSpecToDropdownProps,
	type MetadataDropdownMappedProps,
	type TaskPlacementGroup,
} from '@/features/metadata-fields/core'
import type { TaskStatus } from '@/shared/types'

export function createTaskStatusMetadataDropdownProps(): MetadataDropdownMappedProps<TaskStatus> {
	return mapMetadataActionSpecToDropdownProps(createStatusActionSpec())
}

export function createTaskPriorityMetadataDropdownProps(): MetadataDropdownMappedProps<TaskPriorityValue> {
	return mapMetadataActionSpecToDropdownProps(createPriorityActionSpec())
}

export function createTaskPlacementGroupedDropdownProps({
	mode,
	currentSpaceId,
	spaces,
	projects,
}: {
	mode: 'global' | 'local'
	currentSpaceId: string | null
	spaces: Array<{ id: string; name: string }>
	projects: Array<{
		id: string
		name: string
		spaceId: string
		completedAt?: string | null
		note?: string | null
		spaceName?: string
	}>
}): {
	menuLabel: string
	headerShortcut?: string
	groups: TaskPlacementGroup[]
} {
	return {
		menuLabel: '移动到项目...',
		headerShortcut: '⇧ P',
		groups: buildTaskPlacementGroups({
			mode,
			currentSpaceId,
			spaces,
			projects: projects.map((project) => ({
				...project,
				completedAt: project.completedAt ?? null,
			})),
		}),
	}
}

export const taskDateMetadataIcons = {
	due: <CalendarX2Icon className='size-3.5' />,
	scheduled: <CalendarClockIcon className='size-3.5' />,
	reminder: <BellIcon className='size-3.5' />,
} as const
