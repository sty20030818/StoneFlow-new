import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'

import { KeybindingRegistry } from '@/features/command/keybinding'

import { SHORTCUT_DISPATCH_PRIORITY } from './shortcut-dispatcher'
import { useShortcutDispatcher } from './shortcut-dispatcher-context'
import { ShortcutRegistryProvider, useShortcutRegistry } from './shortcut-registry-context'

describe('ShortcutRegistryProvider', () => {
	it('向运行层与展示层提供同一个 Registry 实例', () => {
		const registry = new KeybindingRegistry()
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ShortcutRegistryProvider registry={registry}>{children}</ShortcutRegistryProvider>
		)

		const { result } = renderHook(() => useShortcutRegistry(), { wrapper })

		expect(result.current).toBe(registry)
	})

	it('缺少组合根 Provider 时 fail-fast', () => {
		expect(() => renderHook(() => useShortcutRegistry())).toThrow(
			'useShortcutRegistry 必须在 ShortcutRegistryProvider 内使用',
		)
	})

	it('内部组合单一 keydown listener，多个 handler 不各自监听 window', () => {
		const addEventListener = vi.spyOn(window, 'addEventListener')
		const registry = new KeybindingRegistry()
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ShortcutRegistryProvider registry={registry}>{children}</ShortcutRegistryProvider>
		)

		renderHook(
			() => {
				useShortcutDispatcher(SHORTCUT_DISPATCH_PRIORITY.row, () => 'unhandled')
				useShortcutDispatcher(SHORTCUT_DISPATCH_PRIORITY.list, () => 'unhandled')
				useShortcutDispatcher(SHORTCUT_DISPATCH_PRIORITY.global, () => 'unhandled')
			},
			{ wrapper },
		)

		expect(addEventListener.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1)
		addEventListener.mockRestore()
	})
})
