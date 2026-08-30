import { ACCENT_PRESETS, DEFAULT_ACCENT_PRESET } from '@/features/appearance'

export type NativeComparisonMode = 'upstream' | 'token'
export const NATIVE_COMPARISON_FIXTURE_IDS = [
	'button',
	'tooltip',
	'oss-actions',
	'oss-text-fields',
	'oss-search-field',
	'oss-number-field',
	'oss-choice-controls',
	'oss-select-listbox',
	'oss-combobox-autocomplete',
	'oss-date-color',
	'oss-compact-metadata',
	'complex-menu',
	'complex-overlays',
	'complex-navigation',
	'complex-collections',
	'complex-command',
	'complex-action-bar',
	'complex-cell-controls',
	'complex-layout-surfaces',
	'complex-timeline-hover-card',
	'complex-empty-state',
] as const
export type NativeComparisonFixtureId = (typeof NATIVE_COMPARISON_FIXTURE_IDS)[number]
export type NativeComparisonAccent = (typeof ACCENT_PRESETS)[number]['id']

export type NativeComparisonQuery = {
	mode: NativeComparisonMode
	fixture: NativeComparisonFixtureId
	accent: NativeComparisonAccent
}

const MODES = new Set<NativeComparisonMode>(['upstream', 'token'])
const FIXTURES = new Set<string>(NATIVE_COMPARISON_FIXTURE_IDS)
const ACCENTS = new Set<NativeComparisonAccent>(ACCENT_PRESETS.map(({ id }) => id))

export function parseNativeComparisonQuery(
	search: string,
): { ok: true; value: NativeComparisonQuery } | { ok: false; message: string } {
	const params = new URLSearchParams(search)
	const mode = params.get('mode')
	const fixture = params.get('fixture')
	const accent = params.get('accent') ?? DEFAULT_ACCENT_PRESET
	if (!MODES.has(mode as NativeComparisonMode)) {
		return { ok: false, message: '无效 mode；仅支持 upstream 或 token。' }
	}
	if (!FIXTURES.has(fixture as NativeComparisonFixtureId)) {
		return { ok: false, message: '无效 fixture；请选择已登记的原生对照。' }
	}
	if (!ACCENTS.has(accent as NativeComparisonAccent)) {
		return { ok: false, message: '无效 accent；请从 StoneFlow 已登记预设中选择。' }
	}
	return {
		ok: true,
		value: {
			mode: mode as NativeComparisonMode,
			fixture: fixture as NativeComparisonFixtureId,
			accent: accent as NativeComparisonAccent,
		},
	}
}

export function nativeComparisonUrl(query: NativeComparisonQuery) {
	return `/ui-lab-baseline.html?${new URLSearchParams(query).toString()}`
}

export function currentNativeComparisonAccent(value: string | undefined): NativeComparisonAccent {
	return ACCENTS.has(value as NativeComparisonAccent)
		? (value as NativeComparisonAccent)
		: DEFAULT_ACCENT_PRESET
}
