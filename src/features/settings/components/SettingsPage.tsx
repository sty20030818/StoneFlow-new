import { useEffect } from 'react'
import { Settings2Icon } from 'lucide-react'

import { openSettings, resolveShellRouteScope, useCurrentShellRoute } from '@/app/navigation'
import {
	getSettingsSectionLabel,
	DEFAULT_SETTINGS_SECTION,
	type SettingsSectionKey,
	writeLastSettingsSection,
} from '../contract'
import { SettingsGeneralPanel } from './panels/SettingsGeneralPanel'
import { SettingsSidebarPanel } from './panels/SettingsSidebarPanel'
import { SettingsSyncPanel } from './panels/SettingsSyncPanel'
import { SettingsSection, SettingsStack } from './settingsShared'
import { UpdateSettingsSection } from '@/features/update'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'

function resolveActiveSection(section: SettingsSectionKey | null | undefined): SettingsSectionKey {
	return section ?? DEFAULT_SETTINGS_SECTION
}

function renderPanel(section: SettingsSectionKey) {
	switch (section) {
		case 'general':
			return <SettingsGeneralPanel />
		case 'sidebar':
			return <SettingsSidebarPanel />
		case 'sync':
			return <SettingsSyncPanel />
		case 'update':
			return (
				<SettingsStack>
					<SettingsSection
						description='控制 StoneFlow 如何检查和安装更新。更新包从 release.sty20030818.space 的 Cloudflare R2 分发。'
						title='应用更新'
					>
						<UpdateSettingsSection />
					</SettingsSection>
				</SettingsStack>
			)
		default: {
			const _exhaustive: never = section
			return _exhaustive
		}
	}
}

/**
 * 设置页壳：按 `settingsSection` 渲染对应 panel。
 * 业务逻辑在各 panel 内，不在此复制配置状态。
 */
export function SettingsPage() {
	const shellRoute = useCurrentShellRoute()
	const section = resolveActiveSection(shellRoute.settingsSection)
	const sectionLabel = getSettingsSectionLabel(section)

	// 仅在路由明确带合法分区时写入，避免 null→general 覆盖用户上次选择
	useEffect(() => {
		if (shellRoute.settingsSection) {
			writeLastSettingsSection(shellRoute.settingsSection)
		}
	}, [shellRoute.settingsSection])

	return (
		<PageFrame.Root>
			<PageFrame.Header
				breadcrumb={
					<AppBreadcrumb
						items={[
							{
								key: 'settings',
								label: '设置',
								icon: Settings2Icon,
								to: openSettings(resolveShellRouteScope(shellRoute), 'general', shellRoute.spaceId),
							},
							{
								key: `settings:${section}`,
								label: sectionLabel,
								current: true,
							},
						]}
					/>
				}
			/>
			<PageFrame.Body>
				<div className='mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col'>
					{renderPanel(section)}
				</div>
			</PageFrame.Body>
		</PageFrame.Root>
	)
}
