import { describe, expect, it, vi } from 'vitest'

import { encodeListTasksDateFilter } from './listDateFilter'

describe('encodeListTasksDateFilter', () => {
	it('none / hasDate / noDate', () => {
		expect(encodeListTasksDateFilter('none')).toBeNull()
		expect(encodeListTasksDateFilter('hasDate')).toEqual({ mode: 'hasDate' })
		expect(encodeListTasksDateFilter('noDate')).toEqual({ mode: 'noDate' })
	})

	it('today 编码为本地日 range', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 7, 3, 15, 0, 0)) // 本地 2026-08-03
		const encoded = encodeListTasksDateFilter('today')
		expect(encoded?.mode).toBe('range')
		if (encoded?.mode === 'range') {
			expect(encoded.from).toBeTruthy()
			expect(encoded.to).toBeTruthy()
			expect(new Date(encoded.from!).getDate()).toBe(3)
			expect(new Date(encoded.to!).getDate()).toBe(3)
		}
		vi.useRealTimers()
	})
})
