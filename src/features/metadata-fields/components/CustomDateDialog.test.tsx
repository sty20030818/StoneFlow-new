import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { CustomDateDialog } from './CustomDateDialog'

describe('CustomDateDialog', () => {
	it('日期导航与对话框关闭按钮使用统一动作提示', async () => {
		render(
			<CustomDateDialog
				fieldKey='dueDate'
				hasExistingValue={false}
				label='截止日期'
				onOpenChange={() => undefined}
				onSubmit={() => undefined}
				open
				value={null}
			/>,
		)

		const previousMonth = screen.getByRole('button', { name: '上一个月' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => previousMonth.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('上一个月')

		act(() => previousMonth.blur())
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
		const close = screen.getByRole('button', { name: '关闭' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => close.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
	})
})
