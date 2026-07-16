/**
 * @fileoverview **settings · 主入口（`@/features/settings`）**
 *
 * ## 三入口约定
 *
 * | 入口 | 用途 |
 * |------|------|
 * | `@/features/settings` | 壳用 API / 类型；**含 contract 再导出**；**不含 Page** |
 * | `@/features/settings/contract` | 纯分区记忆与类型（navigation 优先） |
 * | `@/features/settings/page` | 仅 routes 挂 SettingsPage |
 *
 * 禁止：`@/features/settings/api|model|components/…`（feature 内部除外）
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

// ── Sidebar preference API ──────────────────────────────────────────────────

export type {
	SidebarMainItemKey,
	SidebarFooterItemKey,
	SidebarItemConfig,
	SidebarProjectSectionPreferenceConfig,
	SidebarPreferenceSettings,
	SidebarItemVisibilityTarget,
} from './api/sidebarSettings'

export {
	getSidebarSettings,
	updateSidebarItemVisibility,
	updateSidebarProjectSection,
} from './api/sidebarSettings'

// 注意：SettingsPage 在 ./page，不在本文件
