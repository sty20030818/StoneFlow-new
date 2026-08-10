import { render, type RenderOptions } from '@testing-library/react'
import type { PropsWithChildren, ReactNode } from 'react'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { SELECTION_SHORTCUT_BINDINGS } from '@/features/selection/shortcut-contribution'
import { TASK_ROW_SHORTCUT_BINDINGS } from '@/features/task/shortcut-contribution'
import { TooltipProvider } from '@/shared/components/base/tooltip'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...SELECTION_SHORTCUT_BINDINGS,
	...TASK_ROW_SHORTCUT_BINDINGS,
])

/** 为组件测试提供与应用组合根一致的快捷键和 Tooltip 上下文。 */
export function TestInteractionProviders({ children }: PropsWithChildren) {
	return (
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<TooltipProvider delayDuration={0}>{children}</TooltipProvider>
		</ShortcutRegistryProvider>
	)
}

export function renderWithInteractionProviders(node: ReactNode, options?: RenderOptions) {
	return render(<TestInteractionProviders>{node}</TestInteractionProviders>, options)
}
