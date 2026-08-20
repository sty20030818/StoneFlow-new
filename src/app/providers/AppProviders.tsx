import type { PropsWithChildren } from 'react'
import { Toast } from '@heroui/react'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { SELECTION_SHORTCUT_BINDINGS } from '@/features/selection/shortcut-contribution'
import { TASK_ROW_SHORTCUT_BINDINGS } from '@/features/task/shortcut-contribution'

const APP_SHORTCUT_REGISTRY = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...SELECTION_SHORTCUT_BINDINGS,
	...TASK_ROW_SHORTCUT_BINDINGS,
])

export function AppProviders({ children }: PropsWithChildren) {
	return (
		<ShortcutRegistryProvider registry={APP_SHORTCUT_REGISTRY}>
			{children}
			<Toast.Provider placement='bottom end' />
		</ShortcutRegistryProvider>
	)
}
