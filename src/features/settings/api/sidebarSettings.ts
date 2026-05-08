import { invoke } from '@tauri-apps/api/core'

export type SidebarMainItemKey = 'inbox' | 'allTasks' | 'views' | 'projectOverview'
export type SidebarFooterItemKey = 'archive' | 'trash'

export type SidebarItemConfig = {
	visible: boolean
	order: number
}

export type SidebarProjectSectionPreferenceConfig = {
	visible: boolean
	order: number
	showCounts: boolean
	showCompleted: boolean
}

export type SidebarPreferenceSettings = {
	mainItems: Record<SidebarMainItemKey, SidebarItemConfig>
	projectSection: SidebarProjectSectionPreferenceConfig
	footerItems: Record<SidebarFooterItemKey, SidebarItemConfig>
}

type SidebarSettingsResponse = {
	settings: SidebarPreferenceSettings
}

export type SidebarItemVisibilityTarget =
	| {
			kind: 'main'
			key: SidebarMainItemKey
	  }
	| {
			kind: 'footer'
			key: SidebarFooterItemKey
	  }

/**
 * 读取当前 Shell 使用的 Sidebar 可同步偏好。
 */
export async function getSidebarSettings() {
	const payload = await invoke<SidebarSettingsResponse>('get_sidebar_settings')
	return payload.settings
}

/**
 * 更新单个导航项的显示状态。
 */
export async function updateSidebarItemVisibility(
	target: SidebarItemVisibilityTarget,
	visible: boolean,
) {
	const payload = await invoke<SidebarSettingsResponse>('update_sidebar_item_visibility', {
		input: {
			target,
			visible,
		},
	})
	return payload.settings
}

/**
 * 更新可同步的 Projects 分区配置。
 */
export async function updateSidebarProjectSection(config: SidebarProjectSectionPreferenceConfig) {
	const payload = await invoke<SidebarSettingsResponse>('update_sidebar_project_section', {
		input: { config },
	})
	return payload.settings
}
