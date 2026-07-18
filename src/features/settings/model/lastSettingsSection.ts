import {
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
	type SettingsSectionKey,
} from './settingsSection'

const STORAGE_KEY = 'stoneflow.settings.lastSection'

/** 内存兜底：localStorage 不可用时仍能在同会话内记住 */
let memoryLastSection: SettingsSectionKey = DEFAULT_SETTINGS_SECTION

function readStorage(): string | null {
	try {
		if (typeof localStorage !== 'undefined') {
			return localStorage.getItem(STORAGE_KEY)
		}
	} catch {
		// ignore
	}
	try {
		if (typeof sessionStorage !== 'undefined') {
			return sessionStorage.getItem(STORAGE_KEY)
		}
	} catch {
		// ignore
	}
	return null
}

function writeStorage(section: SettingsSectionKey) {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, section)
		}
	} catch {
		// ignore
	}
	try {
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem(STORAGE_KEY, section)
		}
	} catch {
		// ignore
	}
}

export function readLastSettingsSection(): SettingsSectionKey {
	const raw = readStorage()
	if (raw && isSettingsSectionKey(raw)) {
		memoryLastSection = raw
		return raw
	}
	return memoryLastSection
}

export function writeLastSettingsSection(section: SettingsSectionKey) {
	memoryLastSection = section
	writeStorage(section)
}
