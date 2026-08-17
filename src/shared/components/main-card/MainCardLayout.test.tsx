import { fireEvent, render, screen } from '@testing-library/react'

import { MainCard } from './MainCardLayout'
import { TooltipProvider } from '@/shared/components/base/tooltip'

describe('MainCardLayout', () => {
	it('MainCardBody 使用统一滚动容器协议，并保留 viewport 几何类', () => {
		const { container } = render(
			<MainCard.Root>
				<MainCard.Body className='custom-gap'>
					<div>内容</div>
				</MainCard.Body>
			</MainCard.Root>,
		)

		const viewport = container.querySelector('[data-scroll-container-role="main-card"]')
		expect(viewport).not.toBeNull()
		expect(viewport).toHaveAttribute('data-scroll-container', 'true')
		expect(viewport).toHaveAttribute('data-scroll-container-role', 'main-card')
		expect(viewport?.className).toContain('px-2')
		expect(viewport?.className).toContain('pb-2')
		expect(viewport?.className).toContain('gap-2')
		expect(viewport?.className).toContain('custom-gap')
	})

	it('GhostAction 强制使用 aria-label，并自动生成 icon-only 操作 Tooltip', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<MainCard.GhostAction aria-label='创建任务'>
					<span aria-hidden>+</span>
				</MainCard.GhostAction>
			</TooltipProvider>,
		)

		const action = screen.getByRole('button', { name: '创建任务' })
		expect(action).not.toHaveAttribute('title')
		fireEvent.pointerMove(action, { pointerType: 'mouse' })
		expect(await screen.findByRole('tooltip')).toHaveTextContent('创建任务')
	})
})
