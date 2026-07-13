/**
 * 设置页分区 key（URL segment = key）。
 * V1 IA：通用 / 侧边栏 / 云同步 / 更新。
 */
export const SETTINGS_SECTION_KEYS = ['general', 'sidebar', 'sync', 'update'] as const

export type SettingsSectionKey = (typeof SETTINGS_SECTION_KEYS)[number]

export const DEFAULT_SETTINGS_SECTION: SettingsSectionKey = 'general'

const SETTINGS_SECTION_KEY_SET = new Set<string>(SETTINGS_SECTION_KEYS)

export function isSettingsSectionKey(value: string): value is SettingsSectionKey {
	return SETTINGS_SECTION_KEY_SET.has(value)
}

export function parseSettingsSectionKey(
	value: string | null | undefined,
): SettingsSectionKey | null {
	if (!value) {
		return null
	}
	return isSettingsSectionKey(value) ? value : null
}

/** 非法或空值回落默认分区 */
export function resolveSettingsSectionKey(
	value: string | null | undefined,
): SettingsSectionKey {
	return parseSettingsSectionKey(value) ?? DEFAULT_SETTINGS_SECTION
}
