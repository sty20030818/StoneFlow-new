/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { NavBackForward } from './NavBackForward'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('NavBackForward', () => {
	it('可用和不可用操作都展示 Registry 快捷键，不可用操作追加原因', async () => {
		const onBack = vi.fn()
		const onForward = vi.fn()
		render(
			<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
				<NavBackForward canGoBack canGoForward={false} onBack={onBack} onForward={onForward} />
			</ShortcutRegistryProvider>,
		)

		const backButton = screen.getByRole('button', { name: '后退' })
		fireEvent.pointerMove(backButton, { pointerType: 'mouse' })
		fireEvent.pointerEnter(backButton, { pointerType: 'mouse' })
		expect(await screen.findByRole('tooltip')).toHaveTextContent('后退')
		expect(screen.getByLabelText(/^按 (?:Command|Control) \+ \[$/)).toBeInTheDocument()

		fireEvent.click(backButton)
		expect(onBack).toHaveBeenCalledOnce()

		fireEvent.pointerLeave(backButton, { pointerType: 'mouse' })
		const disabledForwardTrigger = screen.getByRole('group', { name: '前进' })
		fireEvent.pointerMove(disabledForwardTrigger, { pointerType: 'mouse' })
		fireEvent.pointerEnter(disabledForwardTrigger, { pointerType: 'mouse' })
		const disabledTooltip = await screen.findByRole('tooltip')
		expect(disabledTooltip).toHaveTextContent('前进')
		expect(disabledTooltip).toHaveTextContent('没有可前进的页面')
		expect(screen.getByLabelText(/^按 (?:Command|Control) \+ \]$/)).toBeInTheDocument()
		expect(onForward).not.toHaveBeenCalled()
	})
})
