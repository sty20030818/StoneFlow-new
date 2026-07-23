import { CalendarX2Icon } from 'lucide-react'

import type { ProjectOption } from '@/features/project'
import {
	createParentProjectActionSpec,
	mapMetadataActionSpecToDropdownProps,
	type MetadataDropdownMappedProps,
} from '@/features/metadata-fields/core'

export function createProjectParentMetadataDropdownProps(
	projects: Array<Pick<ProjectOption, 'id' | 'name'>>,
): MetadataDropdownMappedProps<string> {
	return mapMetadataActionSpecToDropdownProps(
		createParentProjectActionSpec({
			projects,
		}),
	)
}

export const projectDateMetadataIcons = {
	due: <CalendarX2Icon className='size-3.5' />,
} as const
