import type {
	SidebarFooterItemKey,
	SidebarItemVisibilityTarget,
	SidebarMainItemKey,
} from '@/features/settings'
import { SidebarMenuItem } from '@/shared/components/base/sidebar'

import { MainNavRowContextMenu } from './MainNavRowContextMenu'
import { SidebarNavRow } from './SidebarNavRow'
import type { MainNavItemViewModel } from './types'

type FooterCustomizeItem = {
	key: SidebarFooterItemKey
	label: string
	visible: boolean
	icon: React.ComponentType<{ className?: string }>
}

export type MainNavSidebarMenuItemProps = {
	itemKey: SidebarMainItemKey
	label: string
	icon: MainNavItemViewModel['icon']
	commandId: MainNavItemViewModel['commandId']
	to: string
	badge?: string
	navItems: MainNavItemViewModel[]
	footerItems: FooterCustomizeItem[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

export function MainNavSidebarMenuItem({
	itemKey,
	label,
	icon,
	commandId,
	to,
	badge,
	navItems,
	footerItems,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: MainNavSidebarMenuItemProps) {
	return (
		<SidebarMenuItem>
			<SidebarNavRow
				badge={badge}
				commandId={commandId}
				contextMenuContent={
					<MainNavRowContextMenu
						footerItems={footerItems}
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
