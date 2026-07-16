import { fireEvent, render, screen } from '@testing-library/react'

import {
	RowSelectionCell,
	RowShell,
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_FOCUS_CLASS,
	ROW_SHELL_IDLE_CLASS,
	ROW_SHELL_SELECTED_CLASS,
	ROW_SHELL_SELECTED_FOCUS_CLASS,
} from '@/shared/components/row'

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
		render(<RowShell.Root interactive>interactive row</RowShell.Root>)

		const row = screen.getByRole('button', { name: 'interactive row' })
		expect(row).toHaveAttribute('tabindex', '-1')
	})

	it('keyboard hover 复用 hover/selected 表面，只额外叠加边框', () => {
		const { rerender } = render(
			<RowShell.Root data-testid='row' hovered hoverSource='keyboard'>
				row
			</RowShell.Root>,
		)

		const row = screen.getByTestId('row')
		expect(row.className).toContain('bg-sf-list-row-hover')
		expect(row.className).toContain(ROW_SHELL_FOCUS_CLASS)

		rerender(
			<RowShell.Root data-testid='row' hovered hoverSource='keyboard' selected>
				row
			</RowShell.Root>,
		)
		expect(row.className).toContain('bg-sf-selection-surface-hover')
		expect(row.className).toContain(ROW_SHELL_SELECTED_FOCUS_CLASS)
		expect(row.className).not.toContain('ring-3')
	})

	it('pointer hover 和 selected-hover 使用统一视觉协议', () => {
		const { rerender } = render(
			<RowShell.Root data-testid='row' hovered hoverSource='pointer'>
				row
			</RowShell.Root>,
		)

		expect(screen.getByTestId('row').className).toContain('bg-sf-list-row-hover')
		expect(screen.getByTestId('row').className).not.toContain(ROW_SHELL_FOCUS_CLASS)

		rerender(
			<RowShell.Root data-testid='row' hovered hoverSource='pointer' selected>
				row
			</RowShell.Root>,
		)
		expect(screen.getByTestId('row').className).toContain('bg-sf-selection-surface-hover')
		expect(screen.getByTestId('row').className).not.toContain(ROW_SHELL_SELECTED_FOCUS_CLASS)
	})
})

describe('RowSelectionCell', () => {
	it('未选中未 visible 时保持占位并隐藏', () => {
		const onCheckedChange = vi.fn()
		render(
			<RowSelectionCell ariaLabel='选择任务 A' checked={false} onCheckedChange={onCheckedChange} />,
		)

		const checkbox = screen.getByRole('checkbox', { name: '选择任务 A' })
		expect(checkbox.className).toContain('opacity-0')

		fireEvent.click(checkbox)
		expect(onCheckedChange).toHaveBeenCalledTimes(1)
	})

	it('visible 或 checked 时显示选择框', () => {
		const onCheckedChange = vi.fn()
		const { rerender } = render(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked={false}
				onCheckedChange={onCheckedChange}
				visible
			/>,
		)

		expect(screen.getByRole('checkbox', { name: '选择任务 A' }).className).toContain('opacity-100')

		rerender(<RowSelectionCell ariaLabel='选择任务 A' checked onCheckedChange={onCheckedChange} />)
		expect(screen.getByRole('checkbox', { name: '选择任务 A' }).className).toContain('opacity-100')
	})
})
