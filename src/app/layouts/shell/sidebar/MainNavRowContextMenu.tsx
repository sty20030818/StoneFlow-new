import type {
	SidebarItemVisibilityTarget,
	SidebarMainItemKey,
} from '@/features/settings/api/sidebarSettings'
import {
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuSeparator,
} from '@/shared/ui/base/context-menu'

import { SidebarCustomizeSubmenu } from './SidebarCustomizeSubmenu'
import type { MainNavItemViewModel } from '@/app/layouts/shell/sidebar/types'

export type MainNavRowContextMenuProps = {
	itemKey: SidebarMainItemKey
	navItems: MainNavItemViewModel[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** 主导航行右键：自定义侧栏 + 当前入口显示开关 */
export function MainNavRowContextMenu({
	itemKey,
	navItems,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: MainNavRowContextMenuProps) {
	const currentItem = navItems.find((item) => item.key === itemKey)

	return (
		<ContextMenuContent className='w-52'>
			<ContextMenuGroup>
				<SidebarCustomizeSubmenu
					navItems={navItems}
					onResetMainItemsVisibility={onResetMainItemsVisibility}
					onUpdateItemVisibility={onUpdateItemVisibility}
					visibleNavItemCount={visibleNavItemCount}
				/>
			</ContextMenuGroup>
			{currentItem ? (
				<>
					<ContextMenuSeparator />
					<ContextMenuGroup>
						<ContextMenuCheckboxItem
							checked={currentItem.visible}
							disabled={visibleNavItemCount === 1 && currentItem.visible}
							onCheckedChange={(checked) =>
								onUpdateItemVisibility({ kind: 'main', key: currentItem.key }, checked === true)
							}
						>
							显示当前入口
						</ContextMenuCheckboxItem>
					</ContextMenuGroup>
				</>
			) : null}
		</ContextMenuContent>
	)
}
