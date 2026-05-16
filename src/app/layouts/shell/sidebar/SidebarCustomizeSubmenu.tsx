import type {
	SidebarFooterItemKey,
	SidebarItemVisibilityTarget,
} from '@/features/settings/api/sidebarSettings'
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

type FooterCustomizeItem = {
	key: SidebarFooterItemKey
	label: string
	visible: boolean
	icon: React.ComponentType<{ className?: string }>
}

export type SidebarCustomizeSubmenuProps = {
	navItems: MainNavItemViewModel[]
	footerItems?: FooterCustomizeItem[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** 「自定义侧栏」子菜单：勾选主导航 + 底部导航显示 / 恢复默认 */
export function SidebarCustomizeSubmenu({
	navItems,
	footerItems = [],
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: SidebarCustomizeSubmenuProps) {
	const allMainVisible = navItems.every((item) => item.visible)
	const allFooterVisible = footerItems.every((item) => item.visible)

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
								<item.icon className='size-4' />
								{item.label}
							</ContextMenuCheckboxItem>
						)
					})}
				</ContextMenuGroup>
				{footerItems.length > 0 ? (
					<ContextMenuGroup>
						{footerItems.map((item) => {
							const isLastVisibleItem = item.visible && visibleNavItemCount === 1

							return (
								<ContextMenuCheckboxItem
									checked={item.visible}
									disabled={isLastVisibleItem}
									key={item.key}
									onCheckedChange={(checked) =>
										onUpdateItemVisibility({ kind: 'footer', key: item.key }, checked === true)
									}
								>
									<item.icon className='size-4' />
									{item.label}
								</ContextMenuCheckboxItem>
							)
						})}
					</ContextMenuGroup>
				) : null}
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuItem
						disabled={allMainVisible && allFooterVisible}
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
