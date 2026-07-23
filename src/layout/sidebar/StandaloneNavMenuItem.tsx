import { openSection } from '@/app/navigation'
import type { Scope } from '@/shared/types'
import { SidebarMenuItem } from '@/shared/components/base/sidebar'
import { TargetIcon } from 'lucide-react'

import { SidebarNavRow } from './SidebarNavRow'

export type StandaloneNavMenuItemProps = {
	badge?: string
	currentScope: Scope
	fallbackSpaceId: string | null
	contextMenuContent?: React.ReactNode
}

/** 「独立事项」入口：与主导航共用 SidebarNavRow */
export function StandaloneNavMenuItem({
	badge,
	currentScope,
	fallbackSpaceId,
	contextMenuContent,
}: StandaloneNavMenuItemProps) {
	const standalonePath = openSection(currentScope, 'standalone', fallbackSpaceId)

	return (
		<SidebarMenuItem>
			<SidebarNavRow
				badge={badge}
				contextMenuContent={contextMenuContent}
				icon={TargetIcon}
				label='独立事项'
				to={standalonePath}
				tooltip='独立事项'
			/>
		</SidebarMenuItem>
	)
}
