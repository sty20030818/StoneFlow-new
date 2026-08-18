import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { BoardCollapsibleSection, BoardRows } from '@/shared/components/board'
import { ContextMenuContent } from '@/shared/components/base/context-menu'
import { RowShell } from '@/shared/components/row'

function Wrapper({ children }: { children: ReactNode }) {
	return <>{children}</>
}

function WrappedRow({
	id,
	label,
	selected,
	selectionGroupPosition,
}: {
	id: string
	label: string
	selected: boolean
	selectionGroupPosition?: 'single' | 'first' | 'middle' | 'last'
}) {
	return (
		<Wrapper>
			<RowShell.Root
				aria-label={label}
				data-testid={id}
				data-selection-group-position-probe={selectionGroupPosition}
				interactive
				selected={selected}
				selectionGroupPosition={selectionGroupPosition}
			>
				{label}
			</RowShell.Root>
		</Wrapper>
	)
}

describe('BoardRows', () => {
	it('连在一起的选中行只给首尾 surface 保留对应圆角', () => {
		const items = [
			{ id: 'row-a', label: '未选中 1', selected: false },
			{ id: 'row-b', label: '选中 1', selected: true },
			{ id: 'row-c', label: '选中 2', selected: true },
			{ id: 'row-d', label: '选中 3', selected: true },
		]

		render(
			<BoardRows
				selectedIdSet={new Set(['row-b', 'row-c', 'row-d'])}
				getItemId={(_child, i) => items[i]?.id}
			>
				{items.map((item) => (
					<WrappedRow id={item.id} key={item.id} label={item.label} selected={item.selected} />
				))}
			</BoardRows>,
		)

		const first = screen.getByTestId('row-b')
		const middle = screen.getByTestId('row-c')
		const last = screen.getByTestId('row-d')

		expect(first.className).toContain('rounded-none')
		expect(first.className).toContain('rounded-t-md')
		expect(first.className).not.toContain('rounded-b-md')
		expect(first).toHaveAttribute('data-selection-group-position', 'first')

		expect(middle.className).toContain('rounded-none')
		expect(middle.className).not.toContain('rounded-t-md')
		expect(middle.className).not.toContain('rounded-b-md')
		expect(middle).toHaveAttribute('data-selection-group-position', 'middle')

		expect(last.className).toContain('rounded-none')
		expect(last.className).not.toContain('rounded-t-md')
		expect(last.className).toContain('rounded-b-md')
		expect(last.className).toContain('bg-accent-soft')
		expect(last.parentElement?.className).toContain('bg-accent-soft')
		expect(last).toHaveAttribute('data-selection-group-position', 'last')
	})
})

describe('BoardCollapsibleSection', () => {
	it('在数量 badge 右侧渲染选中数量 badge', () => {
		render(
			<BoardCollapsibleSection
				count={12}
				icon={<span data-testid='icon' />}
				label='进行中'
				onOpenChange={() => undefined}
				open
				selectedCount={3}
			>
				<div>row</div>
			</BoardCollapsibleSection>,
		)

		expect(screen.getByText('12')).toBeInTheDocument()
		expect(screen.getByText('已选 3')).toBeInTheDocument()
	})

	it('折叠动作显示当前语义，并在右键菜单打开时关闭提示', async () => {
		render(
			<BoardCollapsibleSection
				contextMenuContent={<ContextMenuContent>分区菜单</ContextMenuContent>}
				count={2}
				icon={<span />}
				label='进行中'
				onOpenChange={() => undefined}
				open
			>
				<div>row</div>
			</BoardCollapsibleSection>,
		)

		const toggle = screen.getByRole('button', { name: '折叠 进行中' })
		fireEvent.keyDown(document, { key: 'Tab' })
		toggle.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('折叠 进行中')

		fireEvent.pointerDown(toggle, { button: 2, pointerType: 'mouse' })
		fireEvent.contextMenu(toggle.closest('[data-board-section-header]')!)
		expect(await screen.findByText('分区菜单')).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})
