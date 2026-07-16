/**
 * @fileoverview **settings · 唯一对外公共面（`@/features/settings`）**
 *
 * 设置页、侧栏偏好 API、settings section 路由语义。
 *
 * 外模块：`import { … } from '@/features/settings'`
 * 禁止：`@/features/settings/api|model|components/…`
 */

// ── Section 模型 ────────────────────────────────────────────────────────────

export {
	SETTINGS_SECTION_KEYS,
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
	parseSettingsSectionKey,
	resolveSettingsSectionKey,
	getSettingsSectionLabel,
	type SettingsSectionKey,
} from './model/settingsSection'

export { readLastSettingsSection, writeLastSettingsSection } from './model/lastSettingsSection'

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

// ── 官方页面 ────────────────────────────────────────────────────────────────

/** 设置页（routes `/settings` 与 shell settings 段）。 */
export { SettingsPage } from './components/SettingsPage'
