import { openSection } from '@/app/navigation'
import type { Scope } from '@/shared/types'
import { SidebarMenuItem } from '@/shared/components/base/sidebar'
import { TargetIcon } from 'lucide-react'

import { SidebarNavRow } from './SidebarNavRow'

export type NoProjectNavMenuItemProps = {
	badge?: string
	currentScope: Scope
	fallbackSpaceId: string | null
	contextMenuContent?: React.ReactNode
}

/** 「独立事项」入口：与主导航共用 SidebarNavRow */
export function NoProjectNavMenuItem({
	badge,
	currentScope,
	fallbackSpaceId,
	contextMenuContent,
}: NoProjectNavMenuItemProps) {
	const noProjectPath = openSection(currentScope, 'no-project', fallbackSpaceId)

	return (
		<SidebarMenuItem>
			<SidebarNavRow
				badge={badge}
				contextMenuContent={contextMenuContent}
				icon={TargetIcon}
				label='独立事项'
				to={noProjectPath}
				tooltip='独立事项'
			/>
		</SidebarMenuItem>
	)
}
