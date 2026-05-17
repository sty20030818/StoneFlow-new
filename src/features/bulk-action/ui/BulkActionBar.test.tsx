import { fireEvent, render, screen } from '@testing-library/react'

import { BulkActionBar } from './BulkActionBar'

describe('BulkActionBar', () => {
	it('selectedCount 小于 1 时不渲染', () => {
		const { container } = render(
			<BulkActionBar
				action={<button type='button'>操作</button>}
				onClear={() => undefined}
				selectedCount={0}
			/>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('显示选中数量并渲染 action slot', () => {
		render(
			<BulkActionBar
				action={<button type='button'>操作</button>}
				onClear={() => undefined}
				selectedCount={3}
			/>,
		)

		expect(screen.getByRole('toolbar', { name: '批量操作' })).toBeInTheDocument()
		expect(screen.getByText('已选 3 项')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
	})

	it('点击清空按钮调用 onClear', () => {
		const onClear = vi.fn<() => void>()
		render(
			<BulkActionBar
				action={<button type='button'>操作</button>}
				onClear={onClear}
				selectedCount={1}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '清空已选' }))

		expect(onClear).toHaveBeenCalledTimes(1)
	})
})
