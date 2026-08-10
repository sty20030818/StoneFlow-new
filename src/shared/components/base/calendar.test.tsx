import { fireEvent, render, screen } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'

import { Calendar } from './calendar'

describe('Calendar', () => {
	it('月份导航按钮使用全局 Tooltip，并保留可访问名称', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<Calendar defaultMonth={new Date(2026, 4, 1)} />
			</TooltipProvider>,
		)

		const previousButton = screen.getByRole('button', { name: '上一个月' })
		expect(screen.getByRole('button', { name: '下一个月' })).toBeInTheDocument()

		fireEvent.focus(previousButton)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('上一个月')
	})
})
