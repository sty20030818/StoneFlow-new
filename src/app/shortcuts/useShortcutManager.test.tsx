import { act, renderHook } from '@testing-library/react'

import { useShortcutManager } from '@/app/shortcuts/useShortcutManager'
import type { ShortcutBinding, ShortcutId } from '@/shared/shortcuts'

const bindings: ShortcutBinding[] = [
	{ id: 'task-create.open', sequence: ['c'] },
	{ id: 'task-create.open-fullscreen', sequence: ['v'] },
	{ id: 'project-create.open', sequence: ['n', 'p'] },
	{ id: 'goto.inbox', sequence: ['g', 'i'] },
	{ id: 'goto.projects', sequence: ['g', 'p'] },
	{ id: 'goto.views', sequence: ['g', 'v'] },
]

describe('useShortcutManager', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('在非输入态下触发单键动作 c 和 v', () => {
		const onTrigger = vi.fn<(id: ShortcutId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('c')
		fireKey('v')

		expect(onTrigger).toHaveBeenNthCalledWith(1, 'task-create.open')
		expect(onTrigger).toHaveBeenNthCalledWith(2, 'task-create.open-fullscreen')
	})

	it('输入态聚焦时忽略 c / v / n / g', () => {
		const onTrigger = vi.fn<(id: ShortcutId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))
		const input = document.createElement('input')
		document.body.appendChild(input)

		fireKey('c', input)
		fireKey('v', input)
		fireKey('n', input)
		fireKey('g', input)

		expect(onTrigger).not.toHaveBeenCalled()
		document.body.removeChild(input)
	})

	it('在 1000ms 内命中前缀序列时触发动作', () => {
		const onTrigger = vi.fn<(id: ShortcutId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('n')
		act(() => {
			vi.advanceTimersByTime(600)
		})
		fireKey('p')

		expect(onTrigger).toHaveBeenCalledWith('project-create.open')
	})

	it('前缀超时后自动取消', () => {
		const onTrigger = vi.fn<(id: ShortcutId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('n')
		act(() => {
			vi.advanceTimersByTime(1001)
		})
		fireKey('p')

		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('非法第二键会直接退出前缀态', () => {
		const onTrigger = vi.fn<(id: ShortcutId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('g')
		fireKey('x')
		fireKey('i')

		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('支持 g i / g p / g v 导航序列', () => {
		const onTrigger = vi.fn<(id: ShortcutId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('g')
		fireKey('i')
		fireKey('g')
		fireKey('p')
		fireKey('g')
		fireKey('v')

		expect(onTrigger).toHaveBeenNthCalledWith(1, 'goto.inbox')
		expect(onTrigger).toHaveBeenNthCalledWith(2, 'goto.projects')
		expect(onTrigger).toHaveBeenNthCalledWith(3, 'goto.views')
	})

	it('保留 / 与 Cmd/Ctrl+K 的统一入口分发', () => {
		const onTrigger = vi.fn<(id: ShortcutId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('/')
		fireKey('k', document.body, { metaKey: true })
		fireKey('k', document.body, { ctrlKey: true })

		expect(onTrigger).toHaveBeenNthCalledWith(1, 'search.open')
		expect(onTrigger).toHaveBeenNthCalledWith(2, 'command.open')
		expect(onTrigger).toHaveBeenNthCalledWith(3, 'command.open')
	})
})

function fireKey(
	key: string,
	target: EventTarget = window,
	options: Pick<KeyboardEventInit, 'metaKey' | 'ctrlKey' | 'altKey'> = {},
) {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		...options,
	})

	Object.defineProperty(event, 'target', {
		configurable: true,
		value: target === window ? document.body : target,
	})

	act(() => {
		window.dispatchEvent(event)
	})
}
