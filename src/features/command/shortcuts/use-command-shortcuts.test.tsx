import { act, renderHook as renderReactHook } from '@testing-library/react'
import type { ReactNode } from 'react'

import { COMMAND_IDS, type CommandId } from '@/features/command/core'
import { DEFAULT_KEYBINDINGS, KeybindingRegistry } from '@/features/command/keybinding'
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

	it('分发单键命令，并在可编辑元素中忽略普通字符键', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		fireKey('c')
		act(() => vi.runAllTimers())
		expect(onTrigger).toHaveBeenCalledWith(COMMAND_IDS.newQuickTask)

		const input = document.createElement('input')
		document.body.appendChild(input)
		fireKey('c', input)
		act(() => vi.runAllTimers())
		expect(onTrigger).toHaveBeenCalledTimes(1)
		input.remove()
	})

	it('命中时捕获执行回调，不让延迟任务改用后续上下文', () => {
		const firstTrigger = vi.fn<(id: CommandId) => void>()
		const laterTrigger = vi.fn<(id: CommandId) => void>()
		let onTrigger = firstTrigger
		const hook = renderHook(() => useCommandShortcuts({ bindings, onTrigger }))

		fireKey('c')
		onTrigger = laterTrigger
		hook.rerender()
		act(() => vi.runAllTimers())

		expect(firstTrigger).toHaveBeenCalledWith(COMMAND_IDS.newQuickTask)
		expect(laterTrigger).not.toHaveBeenCalled()
	})

	it('上抛 chord 候选、命中导航并保留可打印键默认行为', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const onChordStateChange = vi.fn()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, onChordStateChange }))

		const prefixEvent = fireKey('g')
		const session = onChordStateChange.mock.lastCall?.[0]
		expect(session?.prefixTokens).toEqual([{ type: 'key', value: 'G' }])
		expect(
			session?.options.map(
				(option: { tokens: Array<{ value: string }> }) => option.tokens[0]?.value,
			),
		).toEqual(expect.arrayContaining(['I', 'T']))

		const secondEvent = fireKey('i')
		act(() => vi.runAllTimers())

		expect(prefixEvent.defaultPrevented).toBe(false)
		expect(secondEvent.defaultPrevented).toBe(false)
		expect(onTrigger).toHaveBeenCalledWith(COMMAND_IDS.goStandalone)
		expect(onChordStateChange).toHaveBeenLastCalledWith(null)
	})

	it('非法第二键和超时都会退出 chord，不执行后续孤立按键', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const onChordStateChange = vi.fn()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, onChordStateChange }))

		fireKey('g')
		fireKey('z')
		expect(onChordStateChange).toHaveBeenLastCalledWith(null)

		fireKey('n')
		act(() => vi.advanceTimersByTime(1001))
		fireKey('p')
		act(() => vi.runAllTimers())

		expect(onTrigger).not.toHaveBeenCalled()
		expect(onChordStateChange).toHaveBeenLastCalledWith(null)
	})

	it('统一分发搜索与跨平台命令面板入口，且命令面板允许输入态', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		const macHook = renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'mac' }))
		const input = document.createElement('input')
		document.body.appendChild(input)

		fireKey('/')
		const metaEvent = fireKey('k', input, { metaKey: true })
		macHook.unmount()
		renderHook(() => useCommandShortcuts({ bindings, onTrigger, platform: 'windows' }))
		const ctrlEvent = fireKey('k', input, { ctrlKey: true })
		act(() => vi.runAllTimers())

		expect(metaEvent.defaultPrevented).toBe(false)
		expect(ctrlEvent.defaultPrevented).toBe(false)
		expect(onTrigger).toHaveBeenNthCalledWith(1, COMMAND_IDS.openSearch)
		expect(onTrigger).toHaveBeenNthCalledWith(2, COMMAND_IDS.openCommandMenu)
		expect(onTrigger).toHaveBeenNthCalledWith(3, COMMAND_IDS.openCommandMenu)
		input.remove()
	})

	it('shouldTrigger 拒绝命令时不执行也不阻止浏览器默认行为', () => {
		const onTrigger = vi.fn<(id: CommandId) => void>()
		renderHook(() =>
			useCommandShortcuts({
				bindings,
				onTrigger,
				shouldTrigger: () => false,
				platform: 'mac',
			}),
		)

		const event = fireKey('k', document.body, { metaKey: true })
		act(() => vi.runAllTimers())

		expect(event.defaultPrevented).toBe(false)
		expect(onTrigger).not.toHaveBeenCalled()
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
