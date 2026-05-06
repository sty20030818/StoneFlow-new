import type {
	SidebarItemVisibilityTarget,
	SidebarMainItemKey,
} from '@/features/settings/api/sidebarSettings'
import { SidebarMenuItem } from '@/shared/ui/base/sidebar'

import { MainNavRowContextMenu } from './MainNavRowContextMenu'
import { SidebarNavRow } from './SidebarNavRow'
import type { MainNavItemViewModel } from './types'

export type MainNavSidebarMenuItemProps = {
	itemKey: SidebarMainItemKey
	label: string
	icon: MainNavItemViewModel['icon']
	to: string
	badge?: string
	navItems: MainNavItemViewModel[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

export function MainNavSidebarMenuItem({
	itemKey,
	label,
	icon,
	to,
	badge,
	navItems,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: MainNavSidebarMenuItemProps) {
	return (
		<SidebarMenuItem>
			<SidebarNavRow
				badge={badge}
				contextMenuContent={
					<MainNavRowContextMenu
						itemKey={itemKey}
						navItems={navItems}
						onResetMainItemsVisibility={onResetMainItemsVisibility}
						onUpdateItemVisibility={onUpdateItemVisibility}
						visibleNavItemCount={visibleNavItemCount}
					/>
				}
				icon={icon}
				label={label}
				to={to}
			/>
		</SidebarMenuItem>
	)
}
