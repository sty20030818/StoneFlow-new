import { CalendarX2Icon } from 'lucide-react'

import type { ProjectOption } from '@/features/project/model/types'
import {
	createPlacementActionSpec,
	mapMetadataActionSpecToDropdownProps,
	type MetadataDropdownMappedProps,
	type MetadataPlacementOption,
} from '@/features/metadata-fields/core'

export function createProjectParentMetadataOptions(
	projects: Array<Pick<ProjectOption, 'id' | 'name'>>,
): MetadataPlacementOption[] {
	return createProjectParentMetadataDropdownProps(projects).options
}

export function createProjectParentMetadataDropdownProps(
	projects: Array<Pick<ProjectOption, 'id' | 'name'>>,
): MetadataDropdownMappedProps<MetadataPlacementOption['value']> {
	return mapMetadataActionSpecToDropdownProps(
		createPlacementActionSpec({
			projects,
			labelMode: 'parentProject',
		}),
	)
}

export const projectDateMetadataIcons = {
	due: <CalendarX2Icon className='size-3.5' />,
} as const
