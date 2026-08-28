import type {
	SidebarFooterItemKey,
	SidebarItemVisibilityTarget,
	SidebarMainItemKey,
} from '@/features/settings'

import { SidebarItemContextMenu } from './SidebarItemContextMenu'
import type { MainNavItemViewModel } from './types'

type FooterCustomizeItem = {
	key: SidebarFooterItemKey
	label: string
	visible: boolean
	icon: React.ComponentType<{ className?: string }>
}

type MainNavRowContextMenuProps = {
	itemKey: SidebarMainItemKey
	navItems: MainNavItemViewModel[]
	footerItems: FooterCustomizeItem[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** 主导航行右键：可见性 + 自定义侧栏 */
export function MainNavRowContextMenu({
	itemKey,
	navItems,
	footerItems,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: MainNavRowContextMenuProps) {
	const currentItem = navItems.find((item) => item.settingsKey === itemKey)

	return (
		<SidebarItemContextMenu
			footerItems={footerItems}
			isLastVisible={visibleNavItemCount === 1 && !!currentItem?.visible}
			navItems={navItems}
			onResetMainItemsVisibility={onResetMainItemsVisibility}
			onUpdateItemVisibility={onUpdateItemVisibility}
			target={{ kind: 'main', key: itemKey }}
			visible={currentItem?.visible ?? false}
			visibleNavItemCount={visibleNavItemCount}
		/>
	)
}
