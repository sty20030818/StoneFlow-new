import { CalendarX2Icon, FolderIcon, TargetIcon } from 'lucide-react'

import type { ProjectOption } from '@/features/project/model/types'
import type { MetadataPlacementOption } from '@/features/metadata-fields/core'

export function createProjectParentMetadataOptions(
	projects: Array<Pick<ProjectOption, 'id' | 'name'>>,
): MetadataPlacementOption[] {
	return [
		{
			value: { kind: 'noProject' as const },
			label: '无父项目',
			icon: <TargetIcon className='size-3.5 text-sf-icon-secondary' />,
			isEmptyValue: true,
		},
		...projects.map((project) => ({
			value: { kind: 'project' as const, projectId: project.id },
			label: project.name,
			icon: <FolderIcon className='size-3.5 text-sf-icon-secondary' />,
		})),
	]
}

export const projectDateMetadataIcons = {
	due: <CalendarX2Icon className='size-3.5' />,
} as const
