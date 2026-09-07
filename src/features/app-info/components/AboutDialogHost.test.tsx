import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { AboutDialogHost } from './AboutDialogHost'

vi.mock('./AboutDialog', () => ({
	AboutDialog: ({ open }: { open: boolean }) => (
		<div data-testid='about-dialog'>{String(open)}</div>
	),
}))

it('首次打开时加载 About，关闭后保留已加载 Dialog', async () => {
	const props = { onOpenChange: vi.fn(), onOpenChangelog: vi.fn() }
	const view = render(<AboutDialogHost {...props} open={false} />)
	expect(screen.queryByTestId('about-dialog')).not.toBeInTheDocument()

	view.rerender(<AboutDialogHost {...props} open />)
	await screen.findByText('true')

	view.rerender(<AboutDialogHost {...props} open={false} />)
	await waitFor(() => expect(screen.getByTestId('about-dialog')).toHaveTextContent('false'))
})
