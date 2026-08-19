import { render, screen } from '@testing-library/react'

import { CreateModalContent } from './create-modal-content'

describe('CreateModalContent', () => {
	it('Body 使用 HeroUI ScrollShadow 作为真实滚动容器', () => {
		render(
			<CreateModalContent>
				<CreateModalContent.Title>
					<div>title</div>
				</CreateModalContent.Title>
				<CreateModalContent.Body>
					<div>body content</div>
				</CreateModalContent.Body>
				<CreateModalContent.Metadata>
					<div>meta</div>
				</CreateModalContent.Metadata>
				<CreateModalContent.Footer>
					<div>footer</div>
				</CreateModalContent.Footer>
			</CreateModalContent>,
		)

		const viewport = screen.getByText('body content').closest('[data-slot="scroll-shadow"]')

		expect(viewport).toHaveAttribute('data-slot', 'scroll-shadow')
		expect(viewport?.className).toContain('px-5')
		expect(viewport?.className).toContain('overflow-y-auto')
		expect(viewport?.className).toContain('min-h-0')
		expect(viewport?.className).toContain('flex-1')
	})
})
