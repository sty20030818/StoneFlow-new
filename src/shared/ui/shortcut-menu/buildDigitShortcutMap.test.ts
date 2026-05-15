import { buildDigitShortcutMap } from './buildDigitShortcutMap'

describe('buildDigitShortcutMap', () => {
	it('无空态菜单从 1 开始', () => {
		const result = buildDigitShortcutMap([
			{ label: '待执行', value: 'todo' },
			{ label: '进行中', value: 'doing' },
		])

		expect(result.map((item) => item.digit)).toEqual(['1', '2'])
	})

	it('有空态菜单从 0 开始', () => {
		const result = buildDigitShortcutMap([
			{ label: '无优先级', value: 0, isEmptyValue: true },
			{ label: '低', value: 1 },
			{ label: '中', value: 2 },
		])

		expect(result.map((item) => item.digit)).toEqual(['0', '1', '2'])
	})
})
