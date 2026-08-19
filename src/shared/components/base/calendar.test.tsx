import { act, fireEvent, render, screen } from '@testing-library/react'

import { Calendar } from './calendar'

describe('Calendar', () => {
	it('月份导航按钮使用全局 Tooltip，并保留可访问名称', async () => {
		render(<Calendar defaultMonth={new Date(2026, 4, 1)} />)

		const previousButton = screen.getByRole('button', { name: '上一个月' })
		expect(screen.getByRole('button', { name: '下一个月' })).toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => previousButton.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('上一个月')
	})
})
