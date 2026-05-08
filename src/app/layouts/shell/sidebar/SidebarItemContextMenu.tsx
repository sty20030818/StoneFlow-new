import type {
	SidebarFooterItemKey,
	SidebarItemVisibilityTarget,
} from '@/features/settings/api/sidebarSettings'
import {
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuItem,
} from '@/shared/ui/base/context-menu'
import { CheckIcon, EyeIcon, EyeOffIcon } from 'lucide-react'

import { SidebarCustomizeSubmenu } from './SidebarCustomizeSubmenu'
import type { MainNavItemViewModel } from './types'

type FooterCustomizeItem = {
	key: SidebarFooterItemKey
	label: string
	visible: boolean
	icon: React.ComponentType<{ className?: string }>
}

export type SidebarItemContextMenuProps = {
	/** 当前右键项的可见性目标 */
	target: SidebarItemVisibilityTarget
	/** 当前右键项是否可见 */
	visible: boolean
	/** 是否是最后一个可见项（禁止隐藏） */
	isLastVisible: boolean
	navItems: MainNavItemViewModel[]
	footerItems?: FooterCustomizeItem[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** 通用侧边栏项右键菜单：可见性子菜单 + 自定义侧边栏子菜单 */
export function SidebarItemContextMenu({
	target,
	visible,
	isLastVisible,
	navItems,
	footerItems = [],
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: SidebarItemContextMenuProps) {
	return (
		<ContextMenuContent className='w-52'>
			<ContextMenuGroup>
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						{visible ? <EyeIcon /> : <EyeOffIcon />}
						可见性
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuItem onSelect={() => onUpdateItemVisibility(target, true)}>
							{visible ? <CheckIcon className='size-3.5' /> : <span className='size-3.5' />}
							永远可见
						</ContextMenuItem>
						<ContextMenuItem
							disabled={isLastVisible}
							onSelect={() => onUpdateItemVisibility(target, false)}
						>
							{!visible ? <CheckIcon className='size-3.5' /> : <span className='size-3.5' />}
							不可见
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>
			</ContextMenuGroup>
			<ContextMenuSeparator />
			<ContextMenuGroup>
				<SidebarCustomizeSubmenu
					footerItems={footerItems}
					navItems={navItems}
					onResetMainItemsVisibility={onResetMainItemsVisibility}
					onUpdateItemVisibility={onUpdateItemVisibility}
					visibleNavItemCount={visibleNavItemCount}
				/>
			</ContextMenuGroup>
		</ContextMenuContent>
	)
}
