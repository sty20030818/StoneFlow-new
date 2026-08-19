import { formatDateLabel } from './launcherFormatters'

describe('formatDateLabel', () => {
	it('按本地日期解析 yyyy-MM-dd，避免 UTC 偏移', () => {
		expect(formatDateLabel('2026-05-01')).toBe('5/1')
	})
})
