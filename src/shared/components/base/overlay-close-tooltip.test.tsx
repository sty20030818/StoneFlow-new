import { fireEvent, render, screen } from '@testing-library/react'

import { Dialog, DialogContent, DialogTitle } from './dialog'
import { Sheet, SheetContent, SheetTitle } from './sheet'

describe('overlay close tooltip', () => {
	it('Dialog 的图标关闭按钮显示中文动作提示', async () => {
		render(
			<Dialog defaultOpen>
				<DialogContent>
					<DialogTitle>对话框</DialogTitle>
				</DialogContent>
			</Dialog>,
		)

		const close = screen.getByRole('button', { name: '关闭' })
		fireEvent.keyDown(document, { key: 'Tab' })
		close.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
	})

	it('Sheet 的图标关闭按钮显示中文动作提示', async () => {
		render(
			<Sheet defaultOpen>
				<SheetContent>
					<SheetTitle>侧边面板</SheetTitle>
				</SheetContent>
			</Sheet>,
		)

		const close = screen.getByRole('button', { name: '关闭' })
		fireEvent.keyDown(document, { key: 'Tab' })
		close.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
	})
})
