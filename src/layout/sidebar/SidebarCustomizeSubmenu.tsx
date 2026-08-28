import { ContextMenu } from '@heroui-pro/react'
import { CheckIcon, PanelLeftIcon, RotateCcwIcon } from 'lucide-react'

import type { SidebarFooterItemKey, SidebarItemVisibilityTarget } from '@/features/settings'

import type { MainNavItemViewModel } from './types'

type FooterCustomizeItem = {
	key: SidebarFooterItemKey
	label: string
	visible: boolean
	icon: React.ComponentType<{ className?: string }>
}

type SidebarCustomizeSubmenuProps = {
	navItems: MainNavItemViewModel[]
	footerItems?: FooterCustomizeItem[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** HeroUI ContextMenu 内的「自定义侧栏」子菜单。 */
export function SidebarCustomizeSubmenu({
	navItems,
	footerItems = [],
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: SidebarCustomizeSubmenuProps) {
	const allVisible =
		navItems.every((item) => item.visible) && footerItems.every((item) => item.visible)

	return (
		<ContextMenu.SubmenuTrigger>
			<ContextMenu.Item id='customize-sidebar' textValue='自定义侧边栏'>
				<PanelLeftIcon className='size-4 text-muted' />
				<span>自定义侧边栏</span>
				<ContextMenu.SubmenuIndicator />
			</ContextMenu.Item>
			<ContextMenu.Popover className='w-52' placement='right top'>
				<ContextMenu.Menu aria-label='自定义侧边栏'>
					{navItems.map((item) => {
						const isLastVisibleItem = item.visible && visibleNavItemCount === 1

						return (
							<ContextMenu.Item
								id={`main-${item.settingsKey}`}
								isDisabled={isLastVisibleItem}
								key={item.key}
								onAction={() =>
									onUpdateItemVisibility({ kind: 'main', key: item.settingsKey }, !item.visible)
								}
								textValue={item.label}
							>
								<span className='flex size-4 items-center justify-center'>
									{item.visible ? <CheckIcon className='size-3.5' /> : null}
								</span>
								<item.icon className='size-4 text-muted' />
								<span>{item.label}</span>
							</ContextMenu.Item>
						)
					})}
					{footerItems.map((item) => {
						const isLastVisibleItem = item.visible && visibleNavItemCount === 1

						return (
							<ContextMenu.Item
								id={`footer-${item.key}`}
								isDisabled={isLastVisibleItem}
								key={item.key}
								onAction={() =>
									onUpdateItemVisibility({ kind: 'footer', key: item.key }, !item.visible)
								}
								textValue={item.label}
							>
								<span className='flex size-4 items-center justify-center'>
									{item.visible ? <CheckIcon className='size-3.5' /> : null}
								</span>
								<item.icon className='size-4 text-muted' />
								<span>{item.label}</span>
							</ContextMenu.Item>
						)
					})}
					<ContextMenu.Separator />
					<ContextMenu.Item
						id='reset-sidebar'
						isDisabled={allVisible}
						onAction={onResetMainItemsVisibility}
						textValue='恢复默认侧栏'
					>
						<RotateCcwIcon className='size-4 text-muted' />
						<span>恢复默认侧栏</span>
					</ContextMenu.Item>
				</ContextMenu.Menu>
			</ContextMenu.Popover>
		</ContextMenu.SubmenuTrigger>
	)
}
