import { act, renderHook as renderReactHook } from '@testing-library/react'
import type { ReactNode } from 'react'

import { COMMAND_IDS, type CommandId } from '@/features/command/core'
import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	type Keybinding,
} from '@/features/command/keybinding'
import { ShortcutRegistryProvider } from './shortcut-registry-context'
import { useCommandShortcuts } from './use-command-shortcuts'

const bindings = DEFAULT_KEYBINDINGS
const shortcutRegistry = new KeybindingRegistry(bindings)

function renderHook<Result>(callback: () => Result) {
	return renderReactHook(callback, {
		wrapper: ({ children }: { children: ReactNode }) => (
			<ShortcutRegistryProvider registry={shortcutRegistry}>{children}</ShortcutRegistryProvider>
		),
	})
}

describe('useCommandShortcuts', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('在非输入态下触发 C 快速创建任务，V 不再触发全局创建', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		fireKey('c')
		fireKey('v')
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenCalledTimes(1)
		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.newQuickTask)
	})

	it('输入态聚焦时忽略 c / v / n / g', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))
		const input = document.createElement('input')
		document.body.appendChild(input)

		fireKey('c', input)
		fireKey('v', input)
		fireKey('n', input)
		fireKey('g', input)

		expect(onTrigger).not.toHaveBeenCalled()
		document.body.removeChild(input)
	})

	it('在 1000ms 内命中 N 组创建序列时触发动作', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		for (const key of ['t', 'i', 'p']) {
			fireKey('n')
			act(() => {
				vi.advanceTimersByTime(100)
			})
			fireKey(key)
		}
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.newFullTask)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.newStandaloneTask)
		expect(onTrigger).toHaveBeenNthCalledWith(3, COMMAND_IDS.newProject)
	})

	it('前缀超时后自动取消', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		fireKey('n')
		act(() => {
			vi.advanceTimersByTime(1001)
		})
		fireKey('p')

		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('非法第二键会直接退出前缀态', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		fireKey('g')
		fireKey('x')
		fireKey('i')

		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('支持 G 组导航序列', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		for (const key of ['i', 't', 'f', 'v', 'p', 'a', 'x', 's']) {
			fireKey('g')
			fireKey(key)
		}
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.goStandalone)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.goAllTasks)
		expect(onTrigger).toHaveBeenNthCalledWith(3, COMMAND_IDS.goFocus)
		expect(onTrigger).toHaveBeenNthCalledWith(4, COMMAND_IDS.goViews)
		expect(onTrigger).toHaveBeenNthCalledWith(5, COMMAND_IDS.goProjects)
		expect(onTrigger).toHaveBeenNthCalledWith(6, COMMAND_IDS.goArchive)
		expect(onTrigger).toHaveBeenNthCalledWith(7, COMMAND_IDS.goTrash)
		expect(onTrigger).toHaveBeenNthCalledWith(8, COMMAND_IDS.openSettings)
	})

	it('支持 O 组打开序列', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		for (const key of ['t', 'p']) {
			fireKey('o')
			fireKey(key)
		}
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.openTask)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.openProject)
	})

	it('未接入命令不会通过默认快捷键触发', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		for (const [prefix, key] of [
			['n', 'v'],
			['o', 'v'],
			['o', 's'],
			['o', 'r'],
			['g', 'd'],
			['g', 'u'],
			['g', 'r'],
		] as const) {
			fireKey(prefix)
			fireKey(key)
		}
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('未接入命令不会进入默认 chord 候选', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const onChordStateChange = vi.fn()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, onChordStateChange }))

		for (const [prefix, removedKeys] of [
			['n', ['V']],
			['o', ['V', 'S', 'R']],
			['g', ['D', 'U', 'R']],
		] as const) {
			fireKey(prefix)
			const options = onChordStateChange.mock.lastCall?.[0].options ?? []
			for (const removedKey of removedKeys) {
				expect(options).not.toEqual(
					expect.arrayContaining([expect.objectContaining({ display: removedKey })]),
				)
			}
			fireKey('z')
		}
	})

	it('hidden 仅用于可执行但不展示的运行时绑定', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const runtimeOnlyBinding: Keybinding = {
			...createBinding('test.runtimeOnly', [{ key: 'h' }]),
			display: 'hidden',
		}
		renderHook(() => useCommandShortcuts({ bindings: [runtimeOnlyBinding], onTrigger }))

		fireKey('h')
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenCalledWith('test.runtimeOnly')
	})

	it('输入态聚焦时忽略 O 组前缀', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))
		const input = document.createElement('input')
		document.body.appendChild(input)

		fireKey('o', input)
		fireKey('t')

		expect(onTrigger).not.toHaveBeenCalled()
		document.body.removeChild(input)
	})

	it('保留 / 与 Cmd/Ctrl+K 的统一入口分发', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const macHook = renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'mac' }))

		fireKey('/')
		fireKey('k', document.body, { metaKey: true })
		macHook.unmount()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'windows' }))
		fireKey('k', document.body, { ctrlKey: true })
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.openSearch)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.openCommandMenu)
		expect(onTrigger).toHaveBeenNthCalledWith(3, COMMAND_IDS.openCommandMenu)
	})

	it('Cmd/Ctrl+K 打开命令面板时不 preventDefault，避免系统隐藏鼠标', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const macHook = renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'mac' }))

		const metaEvent = fireKey('k', document.body, { metaKey: true })
		macHook.unmount()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'windows' }))
		const ctrlEvent = fireKey('k', document.body, { ctrlKey: true })
		act(() => {
			vi.runAllTimers()
		})

		expect(metaEvent.defaultPrevented).toBe(false)
		expect(ctrlEvent.defaultPrevented).toBe(false)
		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.openCommandMenu)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.openCommandMenu)
	})

	it('shouldTrigger 返回 false 时不触发也不 preventDefault', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() =>
			useCommandShortcuts({
				bindings,
				onTrigger,
				shouldTrigger: () => false,
				platform: 'mac',
			}),
		)

		const event = new KeyboardEvent('keydown', {
			key: 'k',
			metaKey: true,
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(event, 'target', {
			configurable: true,
			value: document.body,
		})

		act(() => {
			window.dispatchEvent(event)
			vi.runAllTimers()
		})

		expect(event.defaultPrevented).toBe(false)
		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('输入态仍允许 Cmd/Ctrl+K', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const macHook = renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'mac' }))
		const input = document.createElement('input')
		document.body.appendChild(input)

		fireKey('k', input, { metaKey: true })
		macHook.unmount()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'windows' }))
		fireKey('k', input, { ctrlKey: true })
		act(() => {
			vi.runAllTimers()
		})

		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.openCommandMenu)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.openCommandMenu)
		document.body.removeChild(input)
	})

	it('上抛当前 chord 前缀和真实第二键候选', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const onChordStateChange = vi.fn()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, onChordStateChange }))

		fireKey('g')

		const session = onChordStateChange.mock.lastCall?.[0]
		const optionKeys = session?.options.map(
			(option: { tokens: Array<{ value: string }> }) => option.tokens[0]?.value,
		)
		expect(session?.prefixTokens).toEqual([{ type: 'key', value: 'G' }])
		expect(optionKeys).toEqual(expect.arrayContaining(['I', 'T']))
		for (const removedKey of ['D', 'U', 'R']) {
			expect(optionKeys).not.toContain(removedKey)
		}
	})

	it('命中、取消和超时后清空 chord 状态', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const onChordStateChange = vi.fn()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, onChordStateChange }))

		fireKey('n')
		fireKey('t')
		fireKey('g')
		fireKey('z')
		fireKey('o')
		act(() => {
			vi.advanceTimersByTime(1001)
		})

		expect(onChordStateChange).toHaveBeenCalledWith(null)
		expect(onChordStateChange).toHaveBeenLastCalledWith(null)
	})

	it('进入 pending 时不 preventDefault 前缀键（避免触发 macOS 光标隐藏）', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		const event = new KeyboardEvent('keydown', {
			key: 'g',
			bubbles: true,
			cancelable: true,
		})

		Object.defineProperty(event, 'target', {
			configurable: true,
			value: document.body,
		})

		act(() => {
			window.dispatchEvent(event)
		})

		expect(event.defaultPrevented).toBe(false)
		expect(onTrigger).not.toHaveBeenCalled()
	})

	it('命中可打印 chord 后不 preventDefault 字母键（避免光标隐藏），Row 双触发由 GlobalChordGuard 防御', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		const prefixEvent = new KeyboardEvent('keydown', {
			key: 'g',
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(prefixEvent, 'target', {
			configurable: true,
			value: document.body,
		})

		const secondEvent = new KeyboardEvent('keydown', {
			key: 'i',
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(secondEvent, 'target', {
			configurable: true,
			value: document.body,
		})

		act(() => {
			window.dispatchEvent(prefixEvent)
			window.dispatchEvent(secondEvent)
			vi.runAllTimers()
		})

		// 字母键 chord（g→i）两键均不 preventDefault，GlobalChordGuard 负责隔离 Row
		expect(prefixEvent.defaultPrevented).toBe(false)
		expect(secondEvent.defaultPrevented).toBe(false)
		expect(onTrigger).toHaveBeenCalledWith(COMMAND_IDS.goStandalone)
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

	return event
}

function createBinding(
	commandId: CommandId,
	sequence: Keybinding['sequence'],
	allowInEditable = false,
	preventDefault = sequence.some(
		(stroke) =>
			Boolean(stroke.mod || stroke.meta || stroke.ctrl || stroke.alt) ||
			['Enter', 'Delete', 'Backspace', 'Escape', 'Space'].includes(stroke.key),
	),
): Keybinding {
	return {
		commandId,
		sequence,
		scope: 'global',
		display: 'primary',
		preventDefault,
		allowInEditable,
	}
}
