import { fireEvent, render, screen } from '@testing-library/react'

import { Dialog, DialogContent, DialogTitle } from './dialog'
import { Sheet, SheetContent, SheetTitle } from './sheet'
import { TooltipProvider } from './tooltip'

describe('overlay close tooltip', () => {
	it('Dialog 的图标关闭按钮显示中文动作提示', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<Dialog defaultOpen>
					<DialogContent>
						<DialogTitle>对话框</DialogTitle>
					</DialogContent>
				</Dialog>
			</TooltipProvider>,
		)

		const close = screen.getByRole('button', { name: '关闭' })
		fireEvent.focus(close)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
	})

	it('Sheet 的图标关闭按钮显示中文动作提示', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<Sheet defaultOpen>
					<SheetContent>
						<SheetTitle>侧边面板</SheetTitle>
					</SheetContent>
				</Sheet>
			</TooltipProvider>,
		)

		const close = screen.getByRole('button', { name: '关闭' })
		fireEvent.focus(close)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
	})
})
