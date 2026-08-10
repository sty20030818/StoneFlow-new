import { fireEvent, render, screen } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'

import { CustomDateDialog } from './CustomDateDialog'

describe('CustomDateDialog', () => {
	it('日期导航与对话框关闭按钮使用统一动作提示', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<CustomDateDialog
					fieldKey='dueDate'
					hasExistingValue={false}
					label='截止日期'
					onOpenChange={() => undefined}
					onSubmit={() => undefined}
					open
					value={null}
				/>
			</TooltipProvider>,
		)

		const previousMonth = screen.getByRole('button', { name: '上一个月' })
		fireEvent.focus(previousMonth)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('上一个月')

		fireEvent.blur(previousMonth)
		const close = screen.getByRole('button', { name: '关闭' })
		fireEvent.focus(close)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
	})
})
