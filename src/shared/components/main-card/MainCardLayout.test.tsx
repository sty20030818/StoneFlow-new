import { render, screen } from '@testing-library/react'

import { MainCard } from './MainCardLayout'

describe('MainCardLayout', () => {
	it('MainCardBody 使用统一滚动容器协议，并保留 viewport 几何类', () => {
		render(
			<MainCard.Root>
				<MainCard.Body className='custom-gap'>
					<div>内容</div>
				</MainCard.Body>
			</MainCard.Root>,
		)

		const viewport = screen.getByText('内容').parentElement
		expect(viewport).toHaveAttribute('data-scroll-container', 'true')
		expect(viewport).toHaveAttribute('data-scroll-container-role', 'main-card')
		expect(viewport?.className).toContain('px-2')
		expect(viewport?.className).toContain('pb-2')
		expect(viewport?.className).toContain('gap-2')
		expect(viewport?.className).toContain('custom-gap')
	})
})
