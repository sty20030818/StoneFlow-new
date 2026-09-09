import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { ChangelogDialogHost } from './ChangelogDialogHost'

vi.mock('./ChangelogDialog', () => ({
	ChangelogDialog: ({ open }: { open: boolean }) => (
		<div data-testid='changelog-dialog'>{String(open)}</div>
	),
}))

it('首次打开时加载 Changelog，关闭后保留已加载 Dialog', async () => {
	const props = { channel: 'stable' as const, onOpenChange: vi.fn() }
	const view = render(<ChangelogDialogHost {...props} open={false} />)
	expect(screen.queryByTestId('changelog-dialog')).not.toBeInTheDocument()

	view.rerender(<ChangelogDialogHost {...props} open />)
	const dialog = await screen.findByText('true')

	view.rerender(<ChangelogDialogHost {...props} open={false} />)
	await waitFor(() => expect(screen.getByTestId('changelog-dialog')).toHaveTextContent('false'))
	expect(screen.getByTestId('changelog-dialog')).toBe(dialog)

	view.rerender(<ChangelogDialogHost {...props} open />)
	expect(screen.getByTestId('changelog-dialog')).toBe(dialog)
	expect(dialog).toHaveTextContent('true')
})
