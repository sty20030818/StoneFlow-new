/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'

vi.mock('./OverlayScrollbar', () => ({
	OverlayScrollbar: ({ className }: { className?: string }) => (
		<div aria-hidden='true' className={className} data-testid='overlay-scrollbar' />
	),
}))

import { CreateModalContent } from './create-modal-content'

describe('CreateModalContent', () => {
	it('Body 使用 AppScrollArea 作为真实滚动容器，并把描述区间距挂在 viewport', () => {
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

		const viewport = screen.getByText('body content').closest('[data-scroll-container="true"]')
		const wrapper = viewport?.parentElement

		expect(viewport).toHaveAttribute('data-scroll-container', 'true')
		expect(viewport?.className).toContain('px-5')
		expect(viewport?.className).toContain('overflow-y-auto')
		expect(wrapper?.className).toContain('min-h-0')
		expect(wrapper?.className).toContain('flex-1')
		expect(wrapper?.className).not.toContain('px-5')
	})
})
