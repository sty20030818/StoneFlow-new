import { fireEvent, render, screen } from '@testing-library/react'

import {
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_FOCUS_CLASS,
	ROW_SHELL_IDLE_CLASS,
	ROW_SHELL_SELECTED_CLASS,
	ROW_SHELL_SELECTED_FOCUS_CLASS,
} from '@/shared/components/row'
import { TooltipProvider } from '@/shared/components/base/tooltip'

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
	it('未选中未 visible 时保持占位并隐藏，且支持 group-hover 显示', () => {
		const onCheckedChange = vi.fn()
		render(
			<TooltipProvider delayDuration={0}>
				<RowSelectionCell
					ariaLabel='选择任务 A'
					checked={false}
					onCheckedChange={onCheckedChange}
				/>
			</TooltipProvider>,
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
			<TooltipProvider delayDuration={0}>
				<RowSelectionCell
					ariaLabel='选择任务 A'
					checked={false}
					onCheckedChange={onCheckedChange}
					visible
				/>
			</TooltipProvider>,
		)

		expect(
			screen
				.getByRole('checkbox', { name: '选择任务 A' })
				.closest('[data-slot="row-selection-cell"]')?.className,
		).toContain('opacity-100')

		rerender(
			<TooltipProvider delayDuration={0}>
				<RowSelectionCell ariaLabel='选择任务 A' checked onCheckedChange={onCheckedChange} />
			</TooltipProvider>,
		)
		const checked = screen.getByRole('checkbox', { name: '选择任务 A' })
		expect(checked.closest('[data-slot="row-selection-cell"]')?.className).toContain('opacity-100')
		expect(checked).toHaveAttribute('data-state', 'checked')
	})

	it('可用选择框用 ariaLabel 提供操作 Tooltip，禁用且无原因时不编造提示', async () => {
		const { rerender } = render(
			<TooltipProvider delayDuration={0}>
				<RowSelectionCell
					ariaLabel='选择任务 A'
					checked={false}
					onCheckedChange={() => undefined}
					visible
				/>
			</TooltipProvider>,
		)

		fireEvent.focus(screen.getByRole('checkbox', { name: '选择任务 A' }))
		expect(await screen.findByRole('tooltip')).toHaveTextContent('选择任务 A')

		rerender(
			<TooltipProvider delayDuration={0}>
				<RowSelectionCell
					ariaLabel='选择任务 A'
					checked={false}
					disabled
					onCheckedChange={() => undefined}
					visible
				/>
			</TooltipProvider>,
		)

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

		rerender(
			<TooltipProvider delayDuration={0}>
				<RowSelectionCell
					ariaLabel='选择任务 A'
					checked={false}
					disabled
					disabledReason='正在更新任务，暂时无法更改选择'
					onCheckedChange={() => undefined}
					visible
				/>
			</TooltipProvider>,
		)

		fireEvent.focus(screen.getByRole('group', { name: '选择任务 A' }))
		expect(await screen.findByRole('tooltip')).toHaveTextContent('正在更新任务，暂时无法更改选择')
	})
})

describe('RowTitleCell', () => {
	it('仅在标题真实截断时展示完整文本', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<RowTitleCell title='一个完整的任务标题' />
			</TooltipProvider>,
		)

		const trigger = document.querySelector(
			'[data-slot="overflow-tooltip-trigger"]',
		) as HTMLSpanElement
		Object.defineProperty(trigger, 'clientWidth', { configurable: true, value: 80 })
		Object.defineProperty(trigger, 'scrollWidth', { configurable: true, value: 160 })

		fireEvent.pointerEnter(trigger)
		fireEvent.focus(trigger)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('一个完整的任务标题')
	})
})
