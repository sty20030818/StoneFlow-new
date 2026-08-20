import { useNavigate } from '@tanstack/react-router'
import { Button, Tooltip } from '@heroui/react'
import { Sidebar } from '@heroui-pro/react'
import { ChevronLeftIcon } from 'lucide-react'
import type { CSSProperties } from 'react'

import { openStartupFallback } from '@/app/navigation'
import type { Scope } from '@/shared/types'

import { writeLastSettingsSection, type SettingsSectionKey } from '../contract'
import { SETTINGS_NAV_GROUPS } from '../model/settingsNav'

type SettingsSidebarProps = {
	currentScope: Scope
	currentSpaceId: string | null
	activeSettingsSection: SettingsSectionKey | null
	returnPath: string
}

/** Settings Mode 导航；容器由 Shell 决定是桌面 Sidebar 还是 compact Sheet。 */
export function SettingsSidebar({
	currentScope,
	currentSpaceId,
	activeSettingsSection,
	returnPath,
}: SettingsSidebarProps) {
	const navigate = useNavigate({ from: '/' })
	const fallbackSpaceId = currentScope.type === 'space' ? currentScope.spaceId : currentSpaceId

	function handleBack() {
		const target = returnPath.trim().length > 0 ? returnPath : openStartupFallback(currentScope)
		void navigate({ to: target as never })
	}

	function handleOpenSection(path: string, section: SettingsSectionKey) {
		writeLastSettingsSection(section)
		void navigate({ to: path as never, replace: true })
	}

	return (
		<Sidebar
			className='h-full min-h-0'
			style={{ '--sidebar-width': 'inherit', display: 'flex' } as CSSProperties}
		>
			<Sidebar.Header>
				<Tooltip closeDelay={0} delay={0}>
					<Button fullWidth aria-label='返回应用' onPress={handleBack} size='lg' variant='ghost'>
						<span className='flex min-w-0 w-full items-center gap-2'>
							<ChevronLeftIcon className='size-4 shrink-0' />
							<span className='truncate text-left' data-sidebar='label'>
								返回应用
							</span>
						</span>
					</Button>
					<Tooltip.Content placement='right'>返回应用</Tooltip.Content>
				</Tooltip>
			</Sidebar.Header>

			<Sidebar.Content>
				{SETTINGS_NAV_GROUPS.map((group) => (
					<Sidebar.Group key={group.key}>
						<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
						<Sidebar.Menu aria-label={`${group.label}设置`}>
							{group.items.map((item) => {
								const to = item.to(currentScope, fallbackSpaceId)
								const Icon = item.icon

								return (
									<Sidebar.MenuItem
										id={`settings:${item.key}`}
										isCurrent={activeSettingsSection === item.key}
										key={item.key}
										onAction={() => handleOpenSection(to, item.key)}
										textValue={item.label}
										tooltip={item.label}
									>
										<Sidebar.MenuIcon>
											<Icon className='size-4' />
										</Sidebar.MenuIcon>
										<Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
									</Sidebar.MenuItem>
								)
							})}
						</Sidebar.Menu>
					</Sidebar.Group>
				))}
			</Sidebar.Content>
		</Sidebar>
	)
}
