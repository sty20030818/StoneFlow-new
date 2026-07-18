import { useEffect } from 'react'

import { EntityScene } from '@/features/entity-scene'
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
import { UpdateSettingsSection } from '@/features/update'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/components/base/breadcrumb'
import {
	breadcrumbLeadClass,
	breadcrumbLeadIconClass,
} from '@/shared/components/patterns/breadcrumb'
import { Settings2Icon } from 'lucide-react'

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
					<UpdateSettingsSection />
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
		<EntityScene
			breadcrumb={
				<Breadcrumb>
					<BreadcrumbList className='text-sm font-semibold leading-5'>
						<BreadcrumbItem>
							<span className={breadcrumbLeadClass}>
								<Settings2Icon aria-hidden className={breadcrumbLeadIconClass} />
								设置
							</span>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			}
			beforeBoard={<div className='flex flex-col gap-4 pb-4'>{renderPanel(section)}</div>}
			bodyClassName='gap-4 p-2'
			sceneVariant='settings'
		/>
	)
}
