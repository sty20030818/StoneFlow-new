import { fireEvent, render, screen } from '@testing-library/react'

import {
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_FOCUS_CLASS,
	ROW_SHELL_SELECTED_CLASS,
} from '@/shared/components/row'

describe('RowShell', () => {
	it('把 active、selected 与 pending 状态映射到唯一 surface', () => {
		const { rerender } = render(<RowShell.Root data-testid='row'>row</RowShell.Root>)
		const row = screen.getByTestId('row')

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
		expect(row).toHaveClass('opacity-75')
	})

	it('interactive 行提供可由 roving focus 管理的按钮语义', () => {
		render(<RowShell.Root interactive>interactive row</RowShell.Root>)

		expect(screen.getByRole('button', { name: 'interactive row' })).toHaveAttribute(
			'tabindex',
			'-1',
		)
	})

	it.each([
		{ hoverSource: 'keyboard' as const, expectsFocusSurface: true },
		{ hoverSource: 'pointer' as const, expectsFocusSurface: false },
	])(
		'$hoverSource hover 复用 hover surface，并只为键盘来源增加焦点边界',
		({ hoverSource, expectsFocusSurface }) => {
			render(
				<RowShell.Root data-testid='row' hovered hoverSource={hoverSource}>
					row
				</RowShell.Root>,
			)

			const row = screen.getByTestId('row')
			expect(row).toHaveClass('bg-surface-hover')
			expect(row.className.includes(ROW_SHELL_FOCUS_CLASS)).toBe(expectsFocusSurface)
		},
	)
})

describe('RowSelectionCell', () => {
	it('保持选择占位，并把选中变化交给上层', () => {
		const onCheckedChange = vi.fn()
		const { rerender } = render(
			<RowSelectionCell checked={false} label='选择任务 A' onCheckedChange={onCheckedChange} />,
		)

		let checkbox = screen.getByRole('checkbox', { name: '选择任务 A' })
		expect(checkbox.closest('[data-slot="row-selection-cell"]')).toHaveClass('opacity-0')
		expect(checkbox).toHaveAttribute('data-state', 'unchecked')

		fireEvent.click(checkbox)
		expect(onCheckedChange).toHaveBeenCalledOnce()

		rerender(<RowSelectionCell checked label='选择任务 A' onCheckedChange={onCheckedChange} />)
		checkbox = screen.getByRole('checkbox', { name: '选择任务 A' })
		expect(checkbox.closest('[data-slot="row-selection-cell"]')).toHaveClass('opacity-100')
		expect(checkbox).toHaveAttribute('data-state', 'checked')
	})

	it('分离可见标签与无障碍名称，并让禁用原因保持可聚焦', () => {
		const { rerender } = render(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked={false}
				label='选择任务'
				onCheckedChange={() => undefined}
				visible
			/>,
		)

		expect(screen.getByRole('checkbox', { name: '选择任务 A' })).toBeEnabled()

		rerender(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked={false}
				disabled
				disabledReason='正在更新任务，暂时无法更改选择'
				label='选择任务'
				onCheckedChange={() => undefined}
				visible
			/>,
		)

		expect(screen.getByRole('group', { name: '选择任务 A' })).toBeInTheDocument()
		expect(screen.getByRole('checkbox', { name: '选择任务 A' })).toBeDisabled()
	})
})

describe('RowTitleCell', () => {
	it('完成态标题保持弱化删除线', () => {
		render(<RowTitleCell doneLike title='已完成任务' />)

		expect(screen.getByText('已完成任务')).toHaveClass('text-sf-text-tertiary', 'line-through')
	})
})
