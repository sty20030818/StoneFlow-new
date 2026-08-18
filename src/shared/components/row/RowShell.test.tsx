import { fireEvent, render, screen } from '@testing-library/react'

import {
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_FOCUS_CLASS,
	ROW_SHELL_IDLE_CLASS,
	ROW_SHELL_SELECTED_CLASS,
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
		expect(row.className).toContain('bg-surface-hover')
		expect(row.className).toContain(ROW_SHELL_FOCUS_CLASS)

		rerender(
			<RowShell.Root data-testid='row' hovered hoverSource='keyboard' selected>
				row
			</RowShell.Root>,
		)
		expect(row.className).toContain('bg-accent-soft-hover')
		expect(row.className).toContain(ROW_SHELL_FOCUS_CLASS)
		expect(row.className).not.toContain('ring-3')
	})

	it('pointer hover 和 selected-hover 使用统一视觉协议', () => {
		const { rerender } = render(
			<RowShell.Root data-testid='row' hovered hoverSource='pointer'>
				row
			</RowShell.Root>,
		)

		expect(screen.getByTestId('row').className).toContain('bg-surface-hover')
		expect(screen.getByTestId('row').className).not.toContain(ROW_SHELL_FOCUS_CLASS)

		rerender(
			<RowShell.Root data-testid='row' hovered hoverSource='pointer' selected>
				row
			</RowShell.Root>,
		)
		expect(screen.getByTestId('row').className).toContain('bg-accent-soft-hover')
		expect(screen.getByTestId('row').className).not.toContain(ROW_SHELL_FOCUS_CLASS)
	})

	it('原生 focus-visible 只给键盘路径增加克制细边框', () => {
		const { rerender } = render(
			<RowShell.Root data-testid='row' interactive>
				row
			</RowShell.Root>,
		)

		const row = screen.getByTestId('row')
		expect(row.className).toContain('hover:bg-surface-hover')
		expect(row.className).toContain('focus-visible:border-foreground/70')
		expect(row.className).toContain('focus-visible:bg-surface-hover')
		expect(row.className).not.toContain('outline-2')

		rerender(
			<RowShell.Root data-testid='row' interactive selected>
				row
			</RowShell.Root>,
		)
		expect(row.className).toContain('bg-accent-soft')
		expect(row.className).toContain('hover:bg-accent-soft-hover')
		expect(row.className).toContain('focus-visible:bg-accent-soft-hover')
	})

	it('尾部字段只提供默认隐藏布局，响应规则由消费方声明', () => {
		render(<RowShell.Fields data-testid='fields'>fields</RowShell.Fields>)
		const fields = screen.getByTestId('fields')
		expect(fields.className).toContain('hidden')
		expect(fields.className).not.toContain('md:flex')
	})
})

describe('RowSelectionCell', () => {
	it('未选中未 visible 时保持占位并隐藏，且支持 group-hover 显示', () => {
		const onCheckedChange = vi.fn()
		render(
			<RowSelectionCell checked={false} label='选择任务 A' onCheckedChange={onCheckedChange} />,
		)

		const checkbox = screen.getByRole('checkbox', { name: '选择任务 A' })
		const cell = checkbox.closest('[data-slot="row-selection-cell"]')
		expect(cell?.className).toContain('opacity-0')
		expect(cell?.className).toContain('group-has-focus-visible/row-shell:opacity-100')
		expect(cell?.className).toContain('group-hover/row-shell:opacity-100')
		expect(checkbox).toHaveAttribute('data-slot', 'checkbox')
		expect(checkbox).toHaveAttribute('data-state', 'unchecked')

		fireEvent.click(checkbox)
		expect(onCheckedChange).toHaveBeenCalledTimes(1)
	})

	it('visible 或 checked 时显示选择框', () => {
		const onCheckedChange = vi.fn()
		const { rerender } = render(
			<RowSelectionCell
				checked={false}
				label='选择任务 A'
				onCheckedChange={onCheckedChange}
				visible
			/>,
		)

		expect(
			screen
				.getByRole('checkbox', { name: '选择任务 A' })
				.closest('[data-slot="row-selection-cell"]')?.className,
		).toContain('opacity-100')

		rerender(<RowSelectionCell checked label='选择任务 A' onCheckedChange={onCheckedChange} />)
		const checked = screen.getByRole('checkbox', { name: '选择任务 A' })
		expect(checked.closest('[data-slot="row-selection-cell"]')?.className).toContain('opacity-100')
		expect(checked).toHaveAttribute('data-state', 'checked')
	})

	it('可用和禁用选择框分离可见文案与无障碍名称，并保留快捷键', async () => {
		const { rerender } = render(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked={false}
				label='选择任务'
				onCheckedChange={() => undefined}
				tooltipShortcut={<span aria-label='按 X'>X</span>}
				visible
			/>,
		)

		fireEvent.keyDown(document, { key: 'Tab' })
		screen.getByRole('checkbox', { name: '选择任务 A' }).focus()
		const enabledTooltip = await screen.findByRole('tooltip')
		expect(enabledTooltip).toHaveTextContent('选择任务X')
		expect(enabledTooltip).not.toHaveTextContent('任务 A')

		rerender(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked={false}
				disabled
				label='选择任务'
				onCheckedChange={() => undefined}
				tooltipShortcut={<span aria-label='按 X'>X</span>}
				visible
			/>,
		)

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

		rerender(
			<RowSelectionCell
				ariaLabel='选择任务 A'
				checked={false}
				disabled
				disabledReason='正在更新任务，暂时无法更改选择'
				label='选择任务'
				onCheckedChange={() => undefined}
				tooltipShortcut={<span aria-label='按 X'>X</span>}
				visible
			/>,
		)

		fireEvent.keyDown(document, { key: 'Tab' })
		screen.getByRole('group', { name: '选择任务 A' }).focus()
		const disabledTooltip = await screen.findByRole('tooltip')
		expect(disabledTooltip).toHaveTextContent('选择任务X正在更新任务，暂时无法更改选择')
		expect(disabledTooltip).not.toHaveTextContent('任务 A')
		expect(screen.getByLabelText('按 X')).toBeInTheDocument()
	})
})

describe('RowTitleCell', () => {
	it('仅在标题真实截断时展示完整文本', async () => {
		render(<RowTitleCell title='一个完整的任务标题' />)

		const trigger = document.querySelector(
			'[data-slot="overflow-tooltip-trigger"]',
		) as HTMLSpanElement
		Object.defineProperty(trigger, 'clientWidth', { configurable: true, value: 80 })
		Object.defineProperty(trigger, 'scrollWidth', { configurable: true, value: 160 })

		fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
		expect(await screen.findByRole('tooltip')).toHaveTextContent('一个完整的任务标题')
	})
})
