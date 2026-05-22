import { fireEvent, render, screen } from '@testing-library/react'

import {
	CreatedAtCell,
	IconCell,
	RestoreActionCell,
	TagsCell,
} from '@/shared/ui/row'

describe('Shared Row Cells', () => {
	it('CreatedAtCell 使用 formatter 渲染', () => {
		render(<CreatedAtCell formatter={() => '5/7'} value='2026-05-07T10:00:00Z' />)
		expect(screen.getByText('5/7')).toBeInTheDocument()
	})

	it('TagsCell 无值时不渲染占位', () => {
		render(<TagsCell />)
		expect(screen.queryByRole('button', { name: /标签/ })).not.toBeInTheDocument()
	})

	it('RestoreActionCell 点击与禁用态可用', () => {
		const onRestore = vi.fn()
		const { rerender } = render(<RestoreActionCell onRestore={onRestore} />)

		fireEvent.click(screen.getByRole('button', { name: '恢复' }))
		expect(onRestore).toHaveBeenCalledTimes(1)

		rerender(<RestoreActionCell disabled onRestore={onRestore} />)
		expect(screen.getByRole('button', { name: '恢复' })).toBeDisabled()
	})

	it('IconCell 渲染纯展示图标槽', () => {
		render(<IconCell icon={<span data-testid='entity-icon'>A</span>} />)
		expect(screen.getByTestId('entity-icon')).toBeInTheDocument()
	})
})
