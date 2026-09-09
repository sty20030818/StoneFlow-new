import { act, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { useUpdateStore } from '../model/useUpdateStore'
import { UpdateDialogHost } from './UpdateDialogHost'

vi.mock('./UpdateDialog', () => ({
	UpdateDialog: () => <div data-testid='update-dialog' />,
}))

beforeEach(() => useUpdateStore.getState().reset())

it('首次打开时加载 Update，关闭后保留已加载 Dialog', async () => {
	render(<UpdateDialogHost />)
	expect(screen.queryByTestId('update-dialog')).not.toBeInTheDocument()

	act(() => useUpdateStore.setState({ dialogVisible: true }))
	const dialog = await screen.findByTestId('update-dialog')

	act(() => useUpdateStore.setState({ dialogVisible: false }))
	expect(screen.getByTestId('update-dialog')).toBe(dialog)

	act(() => useUpdateStore.setState({ dialogVisible: true }))
	expect(screen.getByTestId('update-dialog')).toBe(dialog)
})
