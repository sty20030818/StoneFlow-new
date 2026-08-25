import {
	getSpaceColorKeyByValue,
	getSpaceColorOption,
	getSpaceVisual,
	SPACE_COLOR_OPTIONS,
} from './spaceVisuals'

describe('Space 颜色映射', () => {
	it('五个 colorKey 与 CSS color value 可以无损双向映射', () => {
		expect(SPACE_COLOR_OPTIONS).toHaveLength(5)
		expect(new Set(SPACE_COLOR_OPTIONS.map((option) => option.value)).size).toBe(5)
		expect(new Set(SPACE_COLOR_OPTIONS.map((option) => option.colorValue)).size).toBe(5)

		for (const option of SPACE_COLOR_OPTIONS) {
			expect(getSpaceColorOption(option.value)).toBe(option)
			expect(getSpaceColorKeyByValue(option.colorValue.toUpperCase())).toBe(option.value)
		}
	})

	it('未知 key 保持蓝色视觉回退，未知颜色值不会生成 colorKey', () => {
		expect(getSpaceColorOption('legacy-color')).toBe(SPACE_COLOR_OPTIONS[0])
		expect(getSpaceColorKeyByValue('#000000')).toBeNull()
		expect(getSpaceVisual({ iconKey: 'user', colorKey: 'legacy-color' })).toEqual(
			getSpaceVisual({ iconKey: 'user', colorKey: 'blue' }),
		)
	})
})
