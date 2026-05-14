import { act, renderHook } from '@testing-library/react'

import { useShortcutManager } from '@/app/shortcuts/useShortcutManager'
import { COMMAND_IDS, type CommandId } from '@/features/command/core'
import type { Keybinding } from '@/features/command/keybinding'

const bindings: Keybinding[] = [
	createBinding(COMMAND_IDS.newTask, [{ key: 'c' }]),
	createBinding(COMMAND_IDS.newTaskFullscreen, [{ key: 'v' }]),
	createBinding(COMMAND_IDS.newProject, [{ key: 'n' }, { key: 'p' }]),
	createBinding(COMMAND_IDS.goInbox, [{ key: 'g' }, { key: 'i' }]),
	createBinding(COMMAND_IDS.goAllTasks, [{ key: 'g' }, { key: 't' }]),
	createBinding(COMMAND_IDS.goViews, [{ key: 'g' }, { key: 'v' }]),
	createBinding(COMMAND_IDS.goProjects, [{ key: 'g' }, { key: 'p' }]),
	createBinding(COMMAND_IDS.goArchive, [{ key: 'g' }, { key: 'a' }]),
	createBinding(COMMAND_IDS.goTrash, [{ key: 'g' }, { key: 'x' }]),
	createBinding(COMMAND_IDS.goSettings, [{ key: 'g' }, { key: 's' }]),
	createBinding(COMMAND_IDS.openSearch, [{ key: '/' }]),
	createBinding(COMMAND_IDS.openCommandMenu, [{ key: 'k', meta: true }], true),
	createBinding(COMMAND_IDS.openCommandMenu, [{ key: 'k', ctrl: true }], true),
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
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('c')
		fireKey('v')
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.newTask)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.newTaskFullscreen)
	})

	it('输入态聚焦时忽略 c / v / n / g', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
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
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('n')
		act(() => {
			vi.advanceTimersByTime(600)
		})
		fireKey('p')
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenCalledWith(COMMAND_IDS.newProject)
	})

	it('前缀超时后自动取消', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('n')
		act(() => {
			vi.advanceTimersByTime(1001)
		})
		fireKey('p')

		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('非法第二键会直接退出前缀态', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('g')
		fireKey('x')
		fireKey('i')

		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('支持 G 组导航序列', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		for (const key of ['i', 't', 'v', 'p', 'a', 'x', 's']) {
			fireKey('g')
			fireKey(key)
		}
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.goInbox)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.goAllTasks)
		expect(onTrigger).toHaveBeenNthCalledWith(3, COMMAND_IDS.goViews)
		expect(onTrigger).toHaveBeenNthCalledWith(4, COMMAND_IDS.goProjects)
		expect(onTrigger).toHaveBeenNthCalledWith(5, COMMAND_IDS.goArchive)
		expect(onTrigger).toHaveBeenNthCalledWith(6, COMMAND_IDS.goTrash)
		expect(onTrigger).toHaveBeenNthCalledWith(7, COMMAND_IDS.goSettings)
	})

	it('保留 / 与 Cmd/Ctrl+K 的统一入口分发', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))

		fireKey('/')
		fireKey('k', document.body, { metaKey: true })
		fireKey('k', document.body, { ctrlKey: true })
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.openSearch)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.openCommandMenu)
		expect(onTrigger).toHaveBeenNthCalledWith(3, COMMAND_IDS.openCommandMenu)
	})

	it('输入态仍允许 Cmd/Ctrl+K', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useShortcutManager({ bindings, onTrigger }))
		const input = document.createElement('input')
		document.body.appendChild(input)

		fireKey('k', input, { metaKey: true })
		fireKey('k', input, { ctrlKey: true })
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.openCommandMenu)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.openCommandMenu)
		document.body.removeChild(input)
	})
})

function fireKey(
	key: string,
	target: EventTarget = window,
	options: Pick<KeyboardEventInit, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> = {},
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

function createBinding(
	commandId: CommandId,
	sequence: Keybinding['sequence'],
	allowInEditable = false,
): Keybinding {
	return {
		commandId,
		sequence,
		scope: 'global',
		preventDefault: true,
		allowInEditable,
	}
}
