import { CalendarX2Icon } from 'lucide-react'

import type { ProjectOption } from '@/features/project/model/types'
import {
	createPlacementActionSpec,
	mapMetadataActionSpecToDropdownProps,
	type MetadataDropdownMappedProps,
} from '@/features/metadata-fields/core'

export function createProjectParentMetadataDropdownProps(
	projects: Array<Pick<ProjectOption, 'id' | 'name'>>,
): MetadataDropdownMappedProps<string> {
	return mapMetadataActionSpecToDropdownProps(
		createPlacementActionSpec({
			projects,
		}),
	)
}

export const projectDateMetadataIcons = {
	due: <CalendarX2Icon className='size-3.5' />,
} as const
