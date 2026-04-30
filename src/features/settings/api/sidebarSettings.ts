import { invoke } from '@tauri-apps/api/core'

export type SidebarMainItemKey = 'inbox' | 'allTasks' | 'views' | 'projectOverview'
export type SidebarFooterItemKey = 'archive' | 'trash'
export type SidebarDesktopPreference = 'expanded' | 'collapsed'

export type SidebarItemConfig = {
	visible: boolean
	order: number
}

export type SidebarProjectSectionConfig = {
	visible: boolean
	order: number
	collapsed: boolean
	showCounts: boolean
	showCompleted: boolean
	maxVisible: number | null
}

export type SidebarSettings = {
	mainItems: Record<SidebarMainItemKey, SidebarItemConfig>
	projectSection: SidebarProjectSectionConfig
	footerItems: Record<SidebarFooterItemKey, SidebarItemConfig>
	width: number
	desktopPreference: SidebarDesktopPreference
}

type SidebarSettingsResponse = {
	settings: SidebarSettings
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
 * 读取当前 Shell 使用的 Sidebar 配置。
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
 * 更新桌面态 Sidebar 宽度。
 */
export async function updateSidebarWidth(width: number) {
	const payload = await invoke<SidebarSettingsResponse>('update_sidebar_width', {
		input: { width },
	})
	return payload.settings
}

/**
 * 更新 Projects 分区配置。
 */
export async function updateSidebarProjectSection(config: SidebarProjectSectionConfig) {
	const payload = await invoke<SidebarSettingsResponse>('update_sidebar_project_section', {
		input: { config },
	})
	return payload.settings
}

/**
 * 更新桌面态展开/收起偏好。
 */
export async function updateSidebarDesktopPreference(desktopPreference: SidebarDesktopPreference) {
	const payload = await invoke<SidebarSettingsResponse>('update_sidebar_desktop_preference', {
		input: { desktopPreference },
	})
	return payload.settings
}
