import { createRef } from 'react'
import { render, screen } from '@testing-library/react'

vi.mock('./OverlayScrollbar', () => ({
	OverlayScrollbar: ({ className }: { className?: string }) => (
		<div aria-hidden='true' className={className} data-testid='overlay-scrollbar' />
	),
}))

import { AppScrollArea } from './AppScrollArea'

describe('AppScrollArea', () => {
	it('viewport 默认带统一滚动协议，并映射 scrollContainerRole', () => {
		render(
			<AppScrollArea scrollContainerRole='main-card'>
				<div>content</div>
			</AppScrollArea>,
		)

		const viewport = screen.getByText('content').parentElement
		expect(viewport).toHaveAttribute('data-scroll-container', 'true')
		expect(viewport).toHaveAttribute('data-scroll-container-role', 'main-card')
		expect(viewport?.className).toContain('no-scrollbar')
		expect(viewport?.className).toContain('overflow-y-auto')
	})

	it('把 ref 转发到真实 viewport，而不是外层 wrapper', () => {
		const ref = createRef<HTMLDivElement>()
		render(
			<AppScrollArea ref={ref}>
				<div>content</div>
			</AppScrollArea>,
		)

		const viewport = screen.getByText('content').parentElement
		expect(ref.current).toBe(viewport)
		expect(ref.current?.dataset.scrollContainer).toBe('true')
	})

	it('区分 wrapper className 与 viewportClassName', () => {
		render(
			<AppScrollArea className='wrapper-class' viewportClassName='viewport-class px-4'>
				<div>content</div>
			</AppScrollArea>,
		)

		const viewport = screen.getByText('content').parentElement
		const wrapper = viewport?.parentElement

		expect(wrapper?.className).toContain('wrapper-class')
		expect(wrapper?.className).not.toContain('viewport-class')
		expect(viewport?.className).toContain('viewport-class')
		expect(viewport?.className).toContain('px-4')
		expect(viewport?.className).not.toContain('wrapper-class')
	})

	it('区分 scrollbarClassName 与 viewportClassName', () => {
		render(
			<AppScrollArea scrollbarClassName='scrollbar-shell' viewportClassName='viewport-class'>
				<div>content</div>
			</AppScrollArea>,
		)

		const viewport = screen.getByText('content').parentElement
		const scrollbar = screen.getByTestId('overlay-scrollbar')

		expect(viewport?.className).toContain('viewport-class')
		expect(viewport?.className).not.toContain('scrollbar-shell')
		expect(scrollbar.className).toContain('scrollbar-shell')
		expect(scrollbar.className).not.toContain('viewport-class')
	})
})
