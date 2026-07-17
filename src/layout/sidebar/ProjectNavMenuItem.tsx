import { openProjectDetail } from '@/app/navigation'
import type { ShellProjectLink } from '@/layout/config'
import type { Scope } from '@/shared/types'
import { SidebarMenuItem } from '@/shared/components/base/sidebar'
import { FolderIcon } from 'lucide-react'

import { ProjectRowContextMenu } from './ProjectRowContextMenu'
import { SidebarNavRow } from './SidebarNavRow'

export type ProjectNavMenuItemProps = {
	currentScope: Scope
	currentSpaceId: string | null
	project: ShellProjectLink
}

export function ProjectNavMenuItem({
	currentScope,
	currentSpaceId,
	project,
}: ProjectNavMenuItemProps) {
	const resolvedSpaceId = currentScope.type === 'space' ? currentScope.spaceId : currentSpaceId

	if (!resolvedSpaceId) {
		return null
	}

	const projectPath = openProjectDetail(project.id, {
		scope: currentScope,
		fallbackSpaceId: resolvedSpaceId,
	})

	return (
		<SidebarMenuItem>
			<SidebarNavRow
				badge={project.badge}
				contextMenuContent={<ProjectRowContextMenu />}
				icon={FolderIcon}
				label={project.label}
				to={projectPath}
			/>
		</SidebarMenuItem>
	)
}
