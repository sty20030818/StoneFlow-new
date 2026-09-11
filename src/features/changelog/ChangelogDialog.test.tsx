import { act, fireEvent, render, screen } from '@testing-library/react'

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
	it.each([false, true])('首尾 Tab 回绕（Shift=%s）', (shiftKey) => {
		useChangelogMock.mockReturnValue({ isLoading: false, releases: [{ version: '0.2.0' }] })
		render(<ChangelogDialog channel='stable' onOpenChange={vi.fn()} open />)
		const first = screen.getByRole('button', { name: '关闭更新日志' })
		const last = screen.getByRole('region', { name: '更新日志内容' })
		const source = shiftKey ? first : last
		const target = shiftKey ? last : first
		act(() => source.focus())
		expect(source).toHaveFocus()

		fireEvent.keyDown(source, { key: 'Tab', shiftKey })

		expect(target).toHaveFocus()
	})

	it('定位版本只在打开时执行，后台刷新不抢回滚动位置', () => {
		const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
		useChangelogMock.mockReturnValue({ isLoading: false, releases: [{ version: '0.2.0' }] })
		const props = {
			channel: 'stable' as const,
			focusVersion: '0.2.0',
			onOpenChange: vi.fn(),
			open: true,
		}
		const view = render(<ChangelogDialog {...props} />)
		expect(scrollIntoView).toHaveBeenCalledTimes(1)

		useChangelogMock.mockReturnValue({
			isLoading: false,
			releases: [{ version: '0.3.0' }, { version: '0.2.0' }],
		})
		view.rerender(<ChangelogDialog {...props} />)
		expect(scrollIntoView).toHaveBeenCalledTimes(1)
		scrollIntoView.mockRestore()
	})

	it('后台刷新时保留正文，不用加载提示替换已有内容', () => {
		useChangelogMock.mockReturnValue({
			isLoading: true,
			releases: [{ version: '0.2.0' }],
		})
		render(<ChangelogDialog channel='stable' onOpenChange={vi.fn()} open />)

		expect(screen.getByRole('article')).toHaveTextContent('v0.2.0')
		expect(screen.queryByText('正在读取更新日志...')).not.toBeInTheDocument()
	})

	it('展示 release，并将关闭动作交给上层', () => {
		useChangelogMock.mockReturnValue({
			isLoading: false,
			releases: [{ version: '0.2.0' }],
		})
		const onOpenChange = vi.fn()

		render(<ChangelogDialog channel='stable' onOpenChange={onOpenChange} open />)

		const readingRegion = screen.getByRole('region', { name: '更新日志内容' })
		expect(readingRegion).toHaveAttribute('tabindex', '0')
		expect(readingRegion).toContainElement(screen.getByRole('article'))
		expect(screen.getByRole('article')).toHaveTextContent('v0.2.0')
		const closeButton = screen.getByRole('button', { name: '关闭更新日志' })
		fireEvent.click(closeButton)
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
