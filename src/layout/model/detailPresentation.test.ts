import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { resolveDetailPresentation } from './detailPresentation'
import { useDetailPresentation } from './useDetailPresentation'

describe('resolveDetailPresentation', () => {
	it.each([
		{
			name: '未测得 panel width',
			detailPresentation: 'aside' as const,
			panelWidth: 0,
			isCompact: false,
			expected: { effectivePresentation: 'sheet', asideWidth: 400 },
		},
		{
			name: '用户偏好 sheet',
			detailPresentation: 'sheet' as const,
			panelWidth: 1400,
			isCompact: false,
			expected: { effectivePresentation: 'sheet', asideWidth: 476 },
		},
		{
			name: 'compact 强制 sheet',
			detailPresentation: 'aside' as const,
			panelWidth: 1400,
			isCompact: true,
			expected: { effectivePresentation: 'sheet', asideWidth: 476 },
		},
		{
			name: '主集合不足 640px',
			detailPresentation: 'aside' as const,
			panelWidth: 1040,
			isCompact: false,
			expected: { effectivePresentation: 'sheet', asideWidth: 400 },
		},
		{
			name: '主集合恰好剩余 640px',
			detailPresentation: 'aside' as const,
			panelWidth: 1041,
			isCompact: false,
			expected: { effectivePresentation: 'aside', asideWidth: 400 },
		},
		{
			name: 'Aside 使用 panel width 的 34%',
			detailPresentation: 'aside' as const,
			panelWidth: 1400,
			isCompact: false,
			expected: { effectivePresentation: 'aside', asideWidth: 476 },
		},
		{
			name: 'Aside 最大 560px',
			detailPresentation: 'aside' as const,
			panelWidth: 2000,
			isCompact: false,
			expected: { effectivePresentation: 'aside', asideWidth: 560 },
		},
	])('$name', ({ detailPresentation, panelWidth, isCompact, expected }) => {
		const resolved = resolveDetailPresentation({ detailPresentation, panelWidth, isCompact })

		expect(resolved.effectivePresentation).toBe(expected.effectivePresentation)
		expect(resolved.asideWidth).toBeCloseTo(expected.asideWidth)
	})
})

describe('useDetailPresentation', () => {
	it('只观察 ShellMain panel 一次并把宽度交给纯函数', () => {
		const observers: ResizeObserverTestDouble[] = []
		vi.spyOn(globalThis, 'ResizeObserver').mockImplementation(
			class ResizeObserverTestDoubleImpl {
				readonly callback: ResizeObserverCallback
				observe = vi.fn()
				unobserve = vi.fn()
				disconnect = vi.fn()

				constructor(callback: ResizeObserverCallback) {
					this.callback = callback
					observers.push(this as unknown as ResizeObserverTestDouble)
				}
			} as unknown as typeof ResizeObserver,
		)

		let current: ReturnType<typeof useDetailPresentation> | undefined
		function Harness() {
			current = useDetailPresentation({
				detailPresentation: 'aside',
				isCompact: false,
			})
			return createElement('div', { ref: current.panelRef })
		}

		const view = render(createElement(Harness))
		expect(observers).toHaveLength(1)
		expect(observers[0].observe).toHaveBeenCalledOnce()

		act(() => {
			observers[0].callback(
				[{ contentRect: { width: 1400 } } as unknown as ResizeObserverEntry],
				observers[0],
			)
		})

		expect(current).toMatchObject({
			panelWidth: 1400,
			effectivePresentation: 'aside',
		})
		expect(current?.panelElement).toBeInstanceOf(HTMLDivElement)
		expect(current?.asideWidth).toBeCloseTo(476)

		view.unmount()
		expect(observers[0].disconnect).toHaveBeenCalledOnce()
	})
})

type ResizeObserverTestDouble = ResizeObserver & {
	callback: ResizeObserverCallback
	observe: ReturnType<typeof vi.fn>
	disconnect: ReturnType<typeof vi.fn>
}
