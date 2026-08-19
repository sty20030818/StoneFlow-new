import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it } from 'vitest'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'

import { DisplayOptionsButton } from './DisplayOptionsButton'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('DisplayOptionsButton', () => {
	it('点击后会打开 display options 面板', async () => {
		renderWithQueryClient(<DisplayOptionsButton pageKey='task:all' />)

		fireEvent.click(screen.getByRole('button', { name: '显示选项' }))

		expect(await screen.findByText('分组')).toBeInTheDocument()
		expect(screen.getByLabelText('分组')).toBeInTheDocument()
	})

	it('打开显示面板时关闭 trigger Tooltip', async () => {
		renderWithQueryClient(<DisplayOptionsButton pageKey='task:all' />)

		const trigger = screen.getByRole('button', { name: '显示选项' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('显示选项')

		fireEvent.click(trigger)
		expect(await screen.findByText('分组')).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('Esc 关闭面板后把焦点还给入口', async () => {
		renderWithQueryClient(<DisplayOptionsButton pageKey='task:all' />)

		const trigger = screen.getByRole('button', { name: '显示选项' })
		act(() => trigger.focus())
		fireEvent.click(trigger)
		const dialog = await screen.findByRole('dialog', { name: '显示选项' })

		fireEvent.keyDown(dialog, { key: 'Escape' })

		await waitFor(() => {
			expect(screen.queryByRole('dialog', { name: '显示选项' })).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
	})
})

function renderWithQueryClient(ui: React.ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	})

	return render(
		<QueryClientProvider client={queryClient}>
			<TestWrapper>{ui}</TestWrapper>
		</QueryClientProvider>,
	)
}

function TestWrapper({ children }: PropsWithChildren) {
	return (
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<div className='p-6'>{children}</div>
		</ShortcutRegistryProvider>
	)
}
