import { fireEvent, render, screen } from '@testing-library/react'

import { RowLayout, RowShell } from '@/shared/components/row'

describe('RowShell', () => {
	it('interactive 行提供可由 roving focus 管理的按钮语义', () => {
		render(<RowShell interactive>interactive row</RowShell>)

		expect(screen.getByRole('button', { name: 'interactive row' })).toHaveAttribute(
			'tabindex',
			'-1',
		)
	})
})

describe('RowLayout', () => {
	it('按公开 named slots 输出领域内容，并省略未提供的可选槽位', () => {
		const { container, rerender } = render(
			<RowLayout actions='操作' leading='状态' primary='标题' properties='属性' selection='选择' />,
		)

		expect(container.querySelector('[data-row-layout-slot="selection"]')).toHaveTextContent('选择')
		expect(container.querySelector('[data-row-layout-slot="leading"]')).toHaveTextContent('状态')
		expect(container.querySelector('[data-row-layout-slot="primary"]')).toHaveTextContent('标题')
		expect(container.querySelector('[data-row-layout-slot="properties"]')).toHaveTextContent('属性')
		expect(container.querySelector('[data-row-layout-slot="actions"]')).toHaveTextContent('操作')

		rerender(<RowLayout primary='仅标题' />)
		expect(container.querySelectorAll('[data-row-layout-slot]')).toHaveLength(1)
		expect(container.querySelector('[data-row-layout-slot="primary"]')).toHaveTextContent('仅标题')
	})

	it('selection 与 actions 槽位阻止嵌套控件误触发 Row 激活', () => {
		const onRowClick = vi.fn()
		render(
			<div onClick={onRowClick}>
				<RowLayout
					actions={<button type='button'>操作</button>}
					primary='标题'
					selection={<button type='button'>选择</button>}
				/>
			</div>,
		)

		fireEvent.click(screen.getByRole('button', { name: '选择' }))
		fireEvent.click(screen.getByRole('button', { name: '操作' }))
		expect(onRowClick).not.toHaveBeenCalled()
	})
})
