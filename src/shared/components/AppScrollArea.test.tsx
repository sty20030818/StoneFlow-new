import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('./OverlayScrollbar', () => ({
	OverlayScrollbar: () => <div aria-hidden='true' data-testid='overlay-scrollbar' />,
}))

import { AppScrollArea, useScrollAreaViewport } from './AppScrollArea'

describe('AppScrollArea', () => {
	it('把同一个真实 viewport 暴露给 forwarded ref 与 TaskBoard context', () => {
		const ref = createRef<HTMLDivElement>()
		const readContextViewport = vi.fn()

		function ViewportProbe() {
			const contextRef = useScrollAreaViewport()
			return (
				<button onClick={() => readContextViewport(contextRef?.current)} type='button'>
					读取 viewport
				</button>
			)
		}

		render(
			<AppScrollArea ref={ref}>
				<ViewportProbe />
			</AppScrollArea>,
		)

		const viewport = screen.getByRole('button', { name: '读取 viewport' }).parentElement
		expect(ref.current).toBe(viewport)
		fireEvent.click(screen.getByRole('button', { name: '读取 viewport' }))
		expect(readContextViewport).toHaveBeenCalledWith(viewport)
		expect(ref.current?.dataset.scrollContainer).toBe('true')
		expect(screen.getByTestId('overlay-scrollbar')).toBeInTheDocument()
	})
})
