import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

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
			<RowLayout
				actions='操作'
				leading='状态'
				primary='标题'
				properties={[{ label: '日期', content: '属性' }]}
				timestamp={{ label: '创建时间', content: '9/11' }}
				selection='选择'
			/>,
		)

		expect(container.querySelector('[data-row-layout-slot="selection"]')).toHaveTextContent('选择')
		expect(container.querySelector('[data-row-layout-slot="leading"]')).toHaveTextContent('状态')
		expect(container.querySelector('[data-row-layout-slot="primary"]')).toHaveTextContent('标题')
		expect(container.querySelector('[data-row-layout-slot="properties"]')).toHaveTextContent('属性')
		expect(container.querySelector('[data-row-layout-slot="timestamp"]')).toHaveTextContent('9/11')
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

	it('属性浮层复用字段内容，操作不激活行，Escape 关闭并回到入口', async () => {
		const onRowClick = vi.fn()
		const onUpdate = vi.fn()
		render(
			<RowShell interactive onClick={onRowClick}>
				<RowLayout
					primary='任务'
					propertiesLabel='任务的属性'
					properties={[{ label: '截止时间', content: <button onClick={onUpdate}>明天</button> }]}
					timestamp={{ label: '创建时间', content: '9/11' }}
				/>
			</RowShell>,
		)
		const trigger = screen.getByRole('button', { name: '查看任务的属性' })
		act(() => trigger.focus())
		fireEvent.click(trigger)
		const dialog = await screen.findByRole('dialog', { name: '任务的属性' })
		expect(within(dialog).getByText('截止时间')).toBeInTheDocument()
		expect(within(dialog).getByText('创建时间')).toBeInTheDocument()
		expect(within(dialog).getByText('9/11')).toBeInTheDocument()
		fireEvent.click(within(dialog).getByRole('button', { name: '明天' }))
		expect(onUpdate).toHaveBeenCalledTimes(1)
		expect(onRowClick).not.toHaveBeenCalled()
		fireEvent.keyDown(dialog, { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		await waitFor(() => expect(trigger).toHaveFocus())
	})

	it('没有可见属性时不保留空槽或无内容的入口', () => {
		const { container } = render(<RowLayout primary='任务' properties={[]} />)
		expect(container.querySelector('[data-row-layout-slot="properties"]')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '查看属性' })).not.toBeInTheDocument()
	})

	it('仅时间槽也可在紧凑属性入口查看，不产生空属性组', async () => {
		const { container } = render(
			<RowLayout primary='任务' timestamp={{ label: '更新时间', content: '9/12' }} />,
		)
		expect(container.querySelector('[data-row-layout-region="fields"]')).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '查看属性' }))
		const dialog = await screen.findByRole('dialog', { name: '属性' })
		expect(within(dialog).getByText('更新时间')).toBeInTheDocument()
		expect(within(dialog).getByText('9/12')).toBeInTheDocument()
	})
})
