import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
	ACCENT_PRESETS,
	applyAccentPreference,
	bootstrapAppearance,
	readAccentPreference,
	setAccentPreference,
} from './index'

const ACCENT_PREFERENCE_KEY = 'stoneflow.appearance.accent'

describe('appearance', () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.className = ''
		delete document.documentElement.dataset.theme
		delete document.documentElement.dataset.accent
	})

	afterEach(() => {
		localStorage.clear()
	})

	it('只接受六个稳定 Accent 标识', () => {
		for (const preset of ACCENT_PRESETS) {
			localStorage.setItem(ACCENT_PREFERENCE_KEY, JSON.stringify(preset.id))
			expect(readAccentPreference()).toBe(preset.id)
		}
	})

	it('缺失、损坏或未知偏好都回退钴蓝', () => {
		expect(readAccentPreference()).toBe('cobalt')

		localStorage.setItem(ACCENT_PREFERENCE_KEY, '{broken')
		expect(readAccentPreference()).toBe('cobalt')

		localStorage.setItem(ACCENT_PREFERENCE_KEY, JSON.stringify('orange'))
		expect(readAccentPreference()).toBe('cobalt')
	})

	it('合法选择立即保存并应用到根节点', () => {
		expect(setAccentPreference('pine')).toBe('pine')
		expect(readAccentPreference()).toBe('pine')
		expect(document.documentElement.dataset.accent).toBe('pine')
	})

	it('两个入口的 bootstrap 在挂载前应用同一 Light 与本机 Accent', () => {
		localStorage.setItem(ACCENT_PREFERENCE_KEY, JSON.stringify('violet'))

		expect(bootstrapAppearance()).toBe('violet')
		expect(document.documentElement).toHaveClass('light')
		expect(document.documentElement.dataset.theme).toBe('stoneflow-light')
		expect(document.documentElement.dataset.accent).toBe('violet')

		localStorage.setItem(ACCENT_PREFERENCE_KEY, JSON.stringify('graphite'))
		expect(applyAccentPreference()).toBe('graphite')
	})
})
