import { ContextMenu } from '@heroui-pro/react'
import { CheckIcon, EyeIcon, EyeOffIcon } from 'lucide-react'

import type { SidebarFooterItemKey, SidebarItemVisibilityTarget } from '@/features/settings'

import { SidebarCustomizeSubmenu } from './SidebarCustomizeSubmenu'
import type { MainNavItemViewModel } from './types'

type FooterCustomizeItem = {
	key: SidebarFooterItemKey
	label: string
	visible: boolean
	icon: React.ComponentType<{ className?: string }>
}

const EMPTY_FOOTER_ITEMS: FooterCustomizeItem[] = []

export type SidebarItemContextMenuProps = {
	target: SidebarItemVisibilityTarget
	visible: boolean
	isLastVisible: boolean
	navItems: MainNavItemViewModel[]
	footerItems?: FooterCustomizeItem[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** HeroUI ContextMenu：当前入口可见性与侧栏定制。 */
export function SidebarItemContextMenu({
	target,
	visible,
	isLastVisible,
	navItems,
	footerItems = EMPTY_FOOTER_ITEMS,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: SidebarItemContextMenuProps) {
	return (
		<ContextMenu.Popover className='w-52'>
			<ContextMenu.Menu aria-label='侧边栏入口操作'>
				<ContextMenu.SubmenuTrigger>
					<ContextMenu.Item id='visibility' textValue='可见性'>
						{visible ? (
							<EyeIcon className='size-4 text-muted' />
						) : (
							<EyeOffIcon className='size-4 text-muted' />
						)}
						<span>可见性</span>
						<ContextMenu.SubmenuIndicator />
					</ContextMenu.Item>
					<ContextMenu.Popover className='w-40' placement='right top'>
						<ContextMenu.Menu aria-label='设置可见性'>
							<ContextMenu.Item
								id='always-visible'
								onAction={() => onUpdateItemVisibility(target, true)}
								textValue='永远可见'
							>
								<span className='flex size-4 items-center justify-center'>
									{visible ? <CheckIcon className='size-3.5' /> : null}
								</span>
								<span>永远可见</span>
							</ContextMenu.Item>
							<ContextMenu.Item
								id='hidden'
								isDisabled={isLastVisible}
								onAction={() => onUpdateItemVisibility(target, false)}
								textValue='不可见'
							>
								<span className='flex size-4 items-center justify-center'>
									{!visible ? <CheckIcon className='size-3.5' /> : null}
								</span>
								<span>不可见</span>
							</ContextMenu.Item>
						</ContextMenu.Menu>
					</ContextMenu.Popover>
				</ContextMenu.SubmenuTrigger>
				<ContextMenu.Separator />
				<SidebarCustomizeSubmenu
					footerItems={footerItems}
					navItems={navItems}
					onResetMainItemsVisibility={onResetMainItemsVisibility}
					onUpdateItemVisibility={onUpdateItemVisibility}
					visibleNavItemCount={visibleNavItemCount}
				/>
			</ContextMenu.Menu>
		</ContextMenu.Popover>
	)
}
