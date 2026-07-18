import type { ComponentType } from 'react'

import { openSettings } from '@/app/navigation'
import type { SettingsSectionKey } from '../contract'
import type { Scope } from '@/shared/types'
import { CloudIcon, PanelLeftIcon, SlidersHorizontalIcon, SparklesIcon } from 'lucide-react'

export type SettingsNavItem = {
	key: SettingsSectionKey
	label: string
	icon: ComponentType<{ className?: string }>
	to: (scope: Scope, fallbackSpaceId?: string | null) => string
}

export type SettingsNavGroup = {
	key: string
	label: string
	items: SettingsNavItem[]
}

/** 设置侧栏导航分组（偏好 / 数据）。 */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
	{
		key: 'preferences',
		label: '偏好',
		items: [
			{
				key: 'general',
				label: '通用',
				icon: SlidersHorizontalIcon,
				to: (scope, fallbackSpaceId) => openSettings(scope, 'general', fallbackSpaceId),
			},
			{
				key: 'sidebar',
				label: '侧边栏',
				icon: PanelLeftIcon,
				to: (scope, fallbackSpaceId) => openSettings(scope, 'sidebar', fallbackSpaceId),
			},
		],
	},
	{
		key: 'data',
		label: '数据',
		items: [
			{
				key: 'sync',
				label: '云同步',
				icon: CloudIcon,
				to: (scope, fallbackSpaceId) => openSettings(scope, 'sync', fallbackSpaceId),
			},
			{
				key: 'update',
				label: '更新',
				icon: SparklesIcon,
				to: (scope, fallbackSpaceId) => openSettings(scope, 'update', fallbackSpaceId),
			},
		],
	},
]
