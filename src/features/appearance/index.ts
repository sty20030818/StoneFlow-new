import { readLocalStorageValue, writeLocalStorageValue } from '@/shared/lib/localStorageValue'

const ACCENT_PREFERENCE_KEY = 'stoneflow.appearance.accent'

export const ACCENT_PRESETS = [
	{ id: 'cobalt', label: '钴蓝' },
	{ id: 'ocean', label: '海洋蓝' },
	{ id: 'violet', label: '烟紫' },
	{ id: 'pine', label: '松柏' },
	{ id: 'plum', label: '梅紫' },
	{ id: 'graphite', label: '石墨' },
] as const

type AccentPresetId = (typeof ACCENT_PRESETS)[number]['id']

const DEFAULT_ACCENT_PRESET: AccentPresetId = 'cobalt'

function normalizeAccentPreference(value: unknown): AccentPresetId {
	return ACCENT_PRESETS.some((preset) => preset.id === value)
		? (value as AccentPresetId)
		: DEFAULT_ACCENT_PRESET
}

export function readAccentPreference(): AccentPresetId {
	return normalizeAccentPreference(readLocalStorageValue<unknown>(ACCENT_PREFERENCE_KEY))
}

export function applyAccentPreference(accent = readAccentPreference()): AccentPresetId {
	const normalizedAccent = normalizeAccentPreference(accent)
	document.documentElement.dataset.accent = normalizedAccent
	return normalizedAccent
}

export function setAccentPreference(accent: string): AccentPresetId {
	const normalizedAccent = normalizeAccentPreference(accent)
	writeLocalStorageValue(ACCENT_PREFERENCE_KEY, normalizedAccent)
	return applyAccentPreference(normalizedAccent)
}

/** 两个 renderer 入口在 React 挂载前共用同一 Light + Accent 首帧合同。 */
export function bootstrapAppearance(): AccentPresetId {
	document.documentElement.classList.add('light')
	document.documentElement.dataset.theme = 'stoneflow-light'
	return applyAccentPreference()
}
