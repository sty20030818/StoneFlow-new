import { openStartupFallback } from '@/app/navigation/intents'
import { SETTINGS_NAV_GROUPS } from '@/app/layouts/shell/settingsNav'
import type { SettingsSectionKey } from '@/features/settings/model/settingsSection'
import type { Scope } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { useNavigate } from '@/app/routing/tanstackCompat'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from '@/shared/ui/base/sidebar'
import {
	sidebarMenuIconClass,
	sidebarMenuLabelClass,
	sidebarShellNavLinkStretchClass,
} from '@/shared/ui/patterns/sidebar-item'
import { ChevronLeftIcon } from 'lucide-react'

/** 设置侧栏分区标题：与原「设置」主标题同级样式，左对齐 */
const settingsSidebarSectionTitleClass = cn(
	'px-2.5 pb-1 pt-3 text-left text-[13px] font-semibold tracking-tight text-foreground',
	'group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:sr-only group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:sr-only',
)

type SettingsSidebarProps = {
	currentScope: Scope
	currentSpaceId: string | null
	activeSettingsSection: SettingsSectionKey | null
	returnPath: string
}

/**
 * Settings Mode 侧栏：返回应用 + 分区导航（偏好 / 数据）。
 * 不渲染 Space switcher / 项目列表 / 同步底条。
 */
export function SettingsSidebar({
	currentScope,
	currentSpaceId,
	activeSettingsSection,
	returnPath,
}: SettingsSidebarProps) {
	const navigate = useNavigate()
	const fallbackSpaceId = currentScope.type === 'space' ? currentScope.spaceId : currentSpaceId

	function handleBack() {
		const target = returnPath.trim().length > 0 ? returnPath : openStartupFallback(currentScope)
		navigate(target)
	}

	function handleOpenSection(path: string) {
		// 设置内分区间不堆 history
		navigate(path, { replace: true })
	}

	return (
		<Sidebar collapsible='icon'>
			<SidebarHeader className='gap-1 px-3 pb-1 pt-2 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-2'>
				<div className={sidebarShellNavLinkStretchClass}>
					<SidebarMenuButton
						aria-label='返回应用'
						className='h-10 min-h-10 justify-start text-left'
						onClick={handleBack}
						tooltip='返回应用'
						type='button'
					>
						<ChevronLeftIcon className={sidebarMenuIconClass} />
						<span className={cn(sidebarMenuLabelClass, 'text-left')}>返回应用</span>
					</SidebarMenuButton>
				</div>
			</SidebarHeader>

			<SidebarContent className='px-0'>
				{SETTINGS_NAV_GROUPS.map((group) => (
					<SidebarGroup
						className='px-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2'
						key={group.key}
					>
						<p className={settingsSidebarSectionTitleClass}>{group.label}</p>
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => {
									const to = item.to(currentScope, fallbackSpaceId)
									const isActive = activeSettingsSection === item.key
									const Icon = item.icon
									return (
										<SidebarMenuItem key={item.key}>
											<div className={sidebarShellNavLinkStretchClass}>
												<SidebarMenuButton
													className='justify-start text-left'
													isActive={isActive}
													onClick={() => handleOpenSection(to)}
													tooltip={item.label}
													type='button'
												>
													<Icon className={sidebarMenuIconClass} />
													<span className={cn(sidebarMenuLabelClass, 'text-left')}>
														{item.label}
													</span>
												</SidebarMenuButton>
											</div>
										</SidebarMenuItem>
									)
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	)
}
