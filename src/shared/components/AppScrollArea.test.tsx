import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { AppScrollArea, useScrollAreaViewport } from './AppScrollArea'

describe('AppScrollArea', () => {
	it('把同一个真实 viewport 暴露给 forwarded ref 与 TaskBoard context', () => {
		const ref = createRef<HTMLDivElement>()
		const readContextViewport = vi.fn()

		function ViewportProbe() {
			const contextViewport = useScrollAreaViewport()
			return (
				<button onClick={() => readContextViewport(contextViewport)} type='button'>
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
		expect(ref.current).toHaveClass('scrollbar', 'overflow-y-auto')
	})
})
