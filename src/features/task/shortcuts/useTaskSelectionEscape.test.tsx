import { act, renderHook } from '@testing-library/react'

import { useTaskSelectionEscape } from './useTaskSelectionEscape'

describe('useTaskSelectionEscape', () => {
	it('有选择时按 Escape 会清空选择并阻止默认行为', () => {
		const clearSelection = vi.fn<() => void>()
		renderHook(() => useTaskSelectionEscape({ hasSelection: true, clearSelection }))

		const event = fireEscape()

		expect(clearSelection).toHaveBeenCalledTimes(1)
		expect(event.defaultPrevented).toBe(true)
	})

	it('没有选择时不处理 Escape', () => {
		const clearSelection = vi.fn<() => void>()
		renderHook(() => useTaskSelectionEscape({ hasSelection: false, clearSelection }))

		const event = fireEscape()

		expect(clearSelection).not.toHaveBeenCalled()
		expect(event.defaultPrevented).toBe(false)
	})

	it('输入态内不清空选择', () => {
		const clearSelection = vi.fn<() => void>()
		const input = document.createElement('input')
		document.body.appendChild(input)
		renderHook(() => useTaskSelectionEscape({ hasSelection: true, clearSelection }))

		const event = fireEscape(input)

		expect(clearSelection).not.toHaveBeenCalled()
		expect(event.defaultPrevented).toBe(false)
		document.body.removeChild(input)
	})

	it('Command Menu、Dialog、Dropdown、Context Menu、Select、Popover、Drawer 打开时不清空选择', () => {
		for (const blocker of [
			createBlocker('div', { 'cmdk-root': '' }),
			createBlocker('div', { 'data-slot': 'dialog-content' }),
			createBlocker('div', { 'data-slot': 'dropdown-menu-content' }),
			createBlocker('div', { 'data-slot': 'context-menu-content' }),
			createBlocker('div', { 'data-slot': 'select-content' }),
			createBlocker('div', { 'data-slot': 'popover-content' }),
			createBlocker('div', { 'data-slot': 'sheet-content' }),
			createBlocker('div', { 'data-shell-drawer-root': 'true' }),
		]) {
			const clearSelection = vi.fn<() => void>()
			document.body.appendChild(blocker)
			const { unmount } = renderHook(() =>
				useTaskSelectionEscape({ hasSelection: true, clearSelection }),
			)

			fireEscape()

			expect(clearSelection).not.toHaveBeenCalled()
			unmount()
			document.body.removeChild(blocker)
		}
	})
})

function fireEscape(target: EventTarget = document.body) {
	const event = new KeyboardEvent('keydown', {
		key: 'Escape',
		bubbles: true,
		cancelable: true,
	})

	Object.defineProperty(event, 'target', {
		configurable: true,
		value: target,
	})

	act(() => {
		window.dispatchEvent(event)
	})

	return event
}

function createBlocker(tagName: keyof HTMLElementTagNameMap, attributes: Record<string, string>) {
	const element = document.createElement(tagName)
	for (const [key, value] of Object.entries(attributes)) {
		element.setAttribute(key, value)
	}
	return element
}
