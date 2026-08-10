import { createContext, use, type ReactNode } from 'react'

import type { KeybindingRegistry } from '@/features/command/keybinding'

import { ShortcutDispatcherProvider } from './shortcut-dispatcher-context'

const ShortcutRegistryContext = createContext<KeybindingRegistry | null>(null)

type ShortcutRegistryProviderProps = {
	registry: KeybindingRegistry
	children: ReactNode
}

/** 在应用组合根注入唯一的快捷键 Registry，运行与展示共享同一实例。 */
export function ShortcutRegistryProvider({ registry, children }: ShortcutRegistryProviderProps) {
	return (
		<ShortcutRegistryContext value={registry}>
			<ShortcutDispatcherProvider>{children}</ShortcutDispatcherProvider>
		</ShortcutRegistryContext>
	)
}

export function useShortcutRegistry() {
	const registry = use(ShortcutRegistryContext)
	if (!registry) {
		throw new Error('useShortcutRegistry 必须在 ShortcutRegistryProvider 内使用')
	}

	return registry
}
