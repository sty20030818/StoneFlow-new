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
	it('自定义关闭动作显示提示并请求关闭', async () => {
		useChangelogMock.mockReturnValue({
			isLoading: false,
			releases: [{ version: '0.2.0' }],
		})
		const onOpenChange = vi.fn()

		render(<ChangelogDialog channel='stable' onOpenChange={onOpenChange} open />)

		const closeButton = screen.getByRole('button', { name: '关闭更新日志' })
		closeButton.blur()
		fireEvent.keyDown(document, { key: 'Tab' })
		closeButton.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')

		fireEvent.click(closeButton)
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
