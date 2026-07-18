/**
 * settings/contract · 纯契约面（无 React / 无 Page）。
 *
 * @remarks
 * 分区类型与「上次打开的设置分区」记忆。
 * 供 `app/navigation`、layout 等纯逻辑安全引用，不会加载 SettingsPage。
 */

export {
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
	getSettingsSectionLabel,
	type SettingsSectionKey,
} from './model/settingsSection'

export { readLastSettingsSection, writeLastSettingsSection } from './model/lastSettingsSection'
