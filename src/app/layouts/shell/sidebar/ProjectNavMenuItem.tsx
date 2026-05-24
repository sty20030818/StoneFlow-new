import { buildScopedProjectPath } from '@/app/routing'
import type { ShellProjectLink } from '@/app/layouts/shell/config'
import type { Scope } from '@/shared/types'
import { SidebarMenuItem } from '@/shared/ui/base/sidebar'
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

	const projectPath = buildScopedProjectPath(currentScope, project.id, resolvedSpaceId)

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
