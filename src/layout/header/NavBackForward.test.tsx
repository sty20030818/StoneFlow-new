/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { TooltipProvider } from '@/shared/components/base/tooltip'

import { NavBackForward } from './NavBackForward'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('NavBackForward', () => {
	it('可用操作展示 Registry 快捷键，不可用操作展示禁用原因', async () => {
		const onBack = vi.fn()
		const onForward = vi.fn()
		render(
			<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
				<TooltipProvider>
					<NavBackForward canGoBack canGoForward={false} onBack={onBack} onForward={onForward} />
				</TooltipProvider>
			</ShortcutRegistryProvider>,
		)

		const backButton = screen.getByRole('button', { name: '后退' })
		fireEvent.focus(backButton)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('后退')
		expect(screen.getByLabelText(/^按 (?:Command|Control) \+ \[$/)).toBeInTheDocument()

		fireEvent.click(backButton)
		expect(onBack).toHaveBeenCalledOnce()

		fireEvent.blur(backButton)
		const disabledForwardTrigger = screen.getByRole('group', { name: '前进' })
		fireEvent.focus(disabledForwardTrigger)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('没有可前进的页面')
		expect(onForward).not.toHaveBeenCalled()
	})
})
