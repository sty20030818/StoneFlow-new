/**
 * settings 主入口（`@/features/settings`）。
 *
 * @remarks
 * 三入口：本文件 = 壳用 API；`/contract` = 分区记忆（navigation）；`/page` = 仅 routes。
 * 禁止深路径进 api/model/components。
 */

/** 壳 Chrome 比对 settings 默认分区；分区类型一并从主入口可得。 */
export {
	DEFAULT_SETTINGS_SECTION,
	type SettingsSectionKey,
	getSettingsSectionLabel,
} from './contract'

// ── 壳用侧栏类型 ────────────────────────────────────────────────────────────

export type {
	SidebarMainItemKey,
	SidebarFooterItemKey,
	SidebarItemVisibilityTarget,
} from './api/sidebarSettings'

export type { DetailPresentation, ShellSidebarSettings } from './api/shellDevicePreferences'
/** 壳/骨架侧栏默认宽（与设备偏好默认一致）。 */
export { DEFAULT_SIDEBAR_WIDTH } from './api/shellDevicePreferences'

// ── 侧栏设置 Zustand（壳与设置面板共用）────────────────────────────────────

export {
	useSidebarSettingsStore,
	selectSidebarSettingsStatus,
	selectSidebarSettings,
	selectSidebarSettingsError,
} from './model/useSidebarSettingsStore'

/** 设置模式侧栏（壳在 isSettingsPath 时挂载）。 */
export { SettingsSidebar } from './components/SettingsSidebar'
