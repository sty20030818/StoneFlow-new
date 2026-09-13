import { act, renderHook } from '@testing-library/react'
import { useLocalDateBasis } from './useLocalDateBasis'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('本地午夜更新日期，卸载后清理计时器', () => {
	vi.setSystemTime(new Date(2026, 8, 13, 23, 59, 59))
	const { result, unmount } = renderHook(() => useLocalDateBasis())
	expect(result.current).toBe('2026-09-13')
	act(() => vi.advanceTimersByTime(1000))
	expect(result.current).toBe('2026-09-14')
	unmount()
	expect(vi.getTimerCount()).toBe(0)
})

it.each(['focus', 'visibilitychange'])('休眠跨天后 %s 立即刷新日期基准', (event) => {
	vi.setSystemTime(new Date(2026, 8, 13, 12))
	const { result } = renderHook(() => useLocalDateBasis())
	act(() => {
		vi.setSystemTime(new Date(2026, 8, 15, 12))
		;(event === 'focus' ? window : document).dispatchEvent(new Event(event))
	})
	expect(result.current).toBe('2026-09-15')
})
