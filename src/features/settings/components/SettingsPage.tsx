import { useEffect } from 'react'
import { Breadcrumbs } from '@heroui/react'
import { Settings2Icon } from 'lucide-react'

import { useCurrentShellRoute } from '@/app/navigation'
import {
	getSettingsSectionLabel,
	DEFAULT_SETTINGS_SECTION,
	type SettingsSectionKey,
	writeLastSettingsSection,
} from '../contract'
import { SettingsGeneralPanel } from './panels/SettingsGeneralPanel'
import { SettingsSidebarPanel } from './panels/SettingsSidebarPanel'
import { SettingsSyncPanel } from './panels/SettingsSyncPanel'
import { SettingsSection } from './settingsShared'
import { UpdateSettingsSection } from '@/features/update'
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
				<div className='flex w-full min-w-0 flex-col gap-4'>
					<SettingsSection
						description='控制 StoneFlow 如何检查和安装更新。更新包从 release.sty20030818.space 的 Cloudflare R2 分发。'
						title='应用更新'
					>
						<UpdateSettingsSection />
					</SettingsSection>
				</div>
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
					<Breadcrumbs aria-label='设置路径'>
						<Breadcrumbs.Item>
							<span className='inline-flex items-center gap-1.5 text-foreground'>
								<Settings2Icon aria-hidden className='size-4 shrink-0 text-muted' />
								设置
							</span>
						</Breadcrumbs.Item>
						<Breadcrumbs.Item>{sectionLabel}</Breadcrumbs.Item>
					</Breadcrumbs>
				}
			/>
			<PageFrame.Body>
				<div className='flex min-h-0 flex-1 flex-col p-2'>{renderPanel(section)}</div>
			</PageFrame.Body>
		</PageFrame.Root>
	)
}
