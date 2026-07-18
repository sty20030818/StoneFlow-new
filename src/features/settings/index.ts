/**
 * settings 主入口（`@/features/settings`）。
 *
 * @remarks
 * 三入口：本文件 = 壳用 API；`/contract` = 分区记忆（navigation）；`/page` = 仅 routes。
 * 禁止深路径进 api/model/components。
 */

// ── contract（主入口再导出，layout 可只记一个路径）────────────────────────

export {
	SETTINGS_SECTION_KEYS,
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
	parseSettingsSectionKey,
	resolveSettingsSectionKey,
	getSettingsSectionLabel,
	type SettingsSectionKey,
	readLastSettingsSection,
	writeLastSettingsSection,
} from './contract'

// ── 壳用侧栏类型 ────────────────────────────────────────────────────────────

export type {
	SidebarMainItemKey,
	SidebarFooterItemKey,
	SidebarItemVisibilityTarget,
} from './api/sidebarSettings'

export type { ShellSidebarSettings } from './api/shellDevicePreferences'

// ── 侧栏设置 Zustand（壳与设置面板共用）────────────────────────────────────

export {
	useSidebarSettingsStore,
	selectSidebarSettingsStatus,
	selectSidebarSettings,
	selectSidebarSettingsError,
} from './model/useSidebarSettingsStore'

/** 设置模式侧栏（壳在 isSettingsPath 时挂载）。 */
export { SettingsSidebar } from './components/SettingsSidebar'
