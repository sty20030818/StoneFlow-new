import { fireEvent, render, screen } from '@testing-library/react'

import {
	RowSelectionCell,
	RowShell,
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_IDLE_CLASS,
	ROW_SHELL_SELECTED_CLASS,
} from '@/shared/ui/row'

describe('RowShell', () => {
	it('根据 active/selected/pending 状态切换表面 class', () => {
		const { rerender } = render(<RowShell.Root data-testid='row'>row</RowShell.Root>)

		const row = screen.getByTestId('row')
		expect(row.className).toContain(ROW_SHELL_IDLE_CLASS)

		rerender(
			<RowShell.Root active data-testid='row'>
				row
			</RowShell.Root>,
		)
		expect(row.className).toContain(ROW_SHELL_ACTIVE_CLASS)

		rerender(
			<RowShell.Root data-testid='row' pending selected>
				row
			</RowShell.Root>,
		)
		expect(row.className).toContain(ROW_SHELL_SELECTED_CLASS)
		expect(row.className).toContain('opacity-75')
	})

	it('interactive 行具备键盘可达性默认语义', () => {
		render(
			<RowShell.Root interactive>
				interactive row
			</RowShell.Root>,
		)

		const row = screen.getByRole('button', { name: 'interactive row' })
		expect(row).toHaveAttribute('tabindex', '0')
	})
})

describe('RowSelectionCell', () => {
	it('未选中时保持占位并在勾选后切到可见态', () => {
		const onCheckedChange = vi.fn()
		const { rerender } = render(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked={false}
				onCheckedChange={onCheckedChange}
			/>,
		)

		const checkbox = screen.getByRole('checkbox', { name: '选择任务 A' })
		expect(checkbox.className).toContain('opacity-0')

		fireEvent.click(checkbox)
		expect(onCheckedChange).toHaveBeenCalledTimes(1)

		rerender(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked
				onCheckedChange={onCheckedChange}
			/>,
		)
		expect(screen.getByRole('checkbox', { name: '选择任务 A' }).className).toContain('opacity-100')
	})
})
