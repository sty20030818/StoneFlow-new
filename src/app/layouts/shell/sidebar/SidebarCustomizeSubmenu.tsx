import type { SidebarItemVisibilityTarget } from '@/features/settings/api/sidebarSettings'
import {
	ContextMenuCheckboxItem,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from '@/shared/ui/base/context-menu'
import { PanelLeftIcon, RotateCcwIcon } from 'lucide-react'

import type { MainNavItemViewModel } from './types'

export type SidebarCustomizeSubmenuProps = {
	navItems: MainNavItemViewModel[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** 「自定义侧栏」子菜单：勾选主导航显示 / 恢复默认 */
export function SidebarCustomizeSubmenu({
	navItems,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: SidebarCustomizeSubmenuProps) {
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger>
				<PanelLeftIcon />
				自定义侧边栏
			</ContextMenuSubTrigger>
			<ContextMenuSubContent className='w-52'>
				<ContextMenuLabel>显示入口</ContextMenuLabel>
				<ContextMenuGroup>
					{navItems.map((item) => {
						const isLastVisibleItem = item.visible && visibleNavItemCount === 1

						return (
							<ContextMenuCheckboxItem
								checked={item.visible}
								disabled={isLastVisibleItem}
								key={item.key}
								onCheckedChange={(checked) =>
									onUpdateItemVisibility({ kind: 'main', key: item.key }, checked === true)
								}
							>
								{item.label}
							</ContextMenuCheckboxItem>
						)
					})}
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuItem
						disabled={navItems.every((item) => item.visible)}
						onSelect={onResetMainItemsVisibility}
					>
						<RotateCcwIcon />
						恢复默认侧栏
					</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuSubContent>
		</ContextMenuSub>
	)
}
