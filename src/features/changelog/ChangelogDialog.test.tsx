import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'

import { ChangelogDialog } from './ChangelogDialog'

const useChangelogMock = vi.hoisted(() => vi.fn())

vi.mock('./useChangelog', () => ({
	useChangelog: useChangelogMock,
}))

vi.mock('./ChangelogRelease', () => ({
	ChangelogRelease: ({ release }: { release: { version: string } }) => (
		<article>v{release.version}</article>
	),
}))

describe('ChangelogDialog', () => {
	it('自定义关闭动作显示提示，并在关闭前收起提示', async () => {
		useChangelogMock.mockReturnValue({
			isLoading: false,
			releases: [{ version: '0.2.0' }],
		})
		const onOpenChange = vi.fn()

		render(
			<TooltipProvider delayDuration={0}>
				<ChangelogDialog channel='stable' onOpenChange={onOpenChange} open />
			</TooltipProvider>,
		)

		const closeButton = screen.getByRole('button', { name: '关闭更新日志' })
		fireEvent.focus(closeButton)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')

		fireEvent.click(closeButton)
		expect(onOpenChange).toHaveBeenCalledWith(false)
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})
