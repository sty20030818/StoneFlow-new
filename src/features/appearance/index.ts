/**
 * 本机外观偏好公共面（`@/features/appearance`）。
 *
 * 只拥有 Accent 预设、Web Storage 读写与根节点应用；不拥有颜色值、账户同步或跨窗口通信。
 * Main 与 Launcher 必须在 React 挂载前经 {@link bootstrapAppearance} 建立首帧外观。
 */
import { readLocalStorageValue, writeLocalStorageValue } from '@/shared/lib/localStorageValue'

const ACCENT_PREFERENCE_KEY = 'stoneflow.appearance.accent'

/**
 * 可供用户选择的稳定 Accent 预设。
 *
 * `id` 同时是本机持久化值和根节点 `data-accent`；颜色映射由 `theme.css` 独占。
 */
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

/**
 * 读取并规范化当前设备的 Accent 偏好。
 *
 * 缺失、损坏或未知值均回退到默认 `cobalt`，但不会把回退值写回存储。
 */
export function readAccentPreference(): AccentPresetId {
	return normalizeAccentPreference(readLocalStorageValue<unknown>(ACCENT_PREFERENCE_KEY))
}

/**
 * 将 Accent 应用到文档根节点。
 *
 * 未传值时重新读取本机偏好；未知值先规范化。只更新 `data-accent`，不持久化。
 */
export function applyAccentPreference(accent = readAccentPreference()): AccentPresetId {
	const normalizedAccent = normalizeAccentPreference(accent)
	document.documentElement.dataset.accent = normalizedAccent
	return normalizedAccent
}

/**
 * 保存并立即应用 Accent 偏好。
 *
 * 非法值统一规范化为默认预设，确保存储与根节点持有同一个合法 ID。
 */
export function setAccentPreference(accent: string): AccentPresetId {
	const normalizedAccent = normalizeAccentPreference(accent)
	writeLocalStorageValue(ACCENT_PREFERENCE_KEY, normalizedAccent)
	return applyAccentPreference(normalizedAccent)
}

/**
 * 在 React 挂载前建立 Main 与 Launcher 共用的 Light + Accent 首帧。
 *
 * 固定写入 StoneFlow Light 主题标识，再读取并应用本机 Accent；不得延后到 React effect。
 */
export function bootstrapAppearance(): AccentPresetId {
	document.documentElement.classList.add('light')
	document.documentElement.dataset.theme = 'stoneflow-light'
	return applyAccentPreference()
}
