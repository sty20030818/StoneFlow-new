import { fireEvent, render, screen } from '@testing-library/react'

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
	it('展示 release，并将关闭动作交给上层', () => {
		useChangelogMock.mockReturnValue({
			isLoading: false,
			releases: [{ version: '0.2.0' }],
		})
		const onOpenChange = vi.fn()

		render(<ChangelogDialog channel='stable' onOpenChange={onOpenChange} open />)

		expect(screen.getByRole('article')).toHaveTextContent('v0.2.0')
		const closeButton = screen.getByRole('button', { name: '关闭更新日志' })
		fireEvent.click(closeButton)
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
