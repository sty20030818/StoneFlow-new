import {
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
	type SettingsSectionKey,
} from '@/features/settings/model/settingsSection'

const STORAGE_KEY = 'stoneflow.settings.lastSection'

export function readLastSettingsSection(): SettingsSectionKey {
	if (typeof sessionStorage === 'undefined') {
		return DEFAULT_SETTINGS_SECTION
	}

	try {
		const raw = sessionStorage.getItem(STORAGE_KEY)
		if (raw && isSettingsSectionKey(raw)) {
			return raw
		}
	} catch {
		// ignore quota / private mode
	}

	return DEFAULT_SETTINGS_SECTION
}

export function writeLastSettingsSection(section: SettingsSectionKey) {
	if (typeof sessionStorage === 'undefined') {
		return
	}

	try {
		sessionStorage.setItem(STORAGE_KEY, section)
	} catch {
		// ignore
	}
}
