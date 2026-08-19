import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import {
	BoardCollapsibleSection,
	BoardRows,
	BoardSectionContextMenu,
} from '@/shared/components/board'
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
	it('把连续选中区间的位置传给每一行', () => {
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

		expect(first).toHaveAttribute('data-selection-group-position', 'first')
		expect(middle).toHaveAttribute('data-selection-group-position', 'middle')
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

	it('分区右键菜单把折叠动作交给上层', async () => {
		const onCollapse = vi.fn()
		render(
			<BoardCollapsibleSection
				contextMenuContent={
					<BoardSectionContextMenu
						onCollapse={onCollapse}
						onCollapseAll={() => undefined}
						onDeselectAll={() => undefined}
						onExpand={() => undefined}
						onExpandAll={() => undefined}
						onSelectAll={() => undefined}
						open
						selectedCount={0}
					/>
				}
				count={2}
				icon={<span />}
				label='进行中'
				onOpenChange={() => undefined}
				open
			>
				<div>row</div>
			</BoardCollapsibleSection>,
		)

		const header = screen
			.getByRole('button', { name: '折叠 进行中' })
			.closest('[data-board-section-header]')
		fireEvent.contextMenu(header!)
		fireEvent.click(await screen.findByRole('menuitem', { name: '折叠该分区' }))
		expect(onCollapse).toHaveBeenCalledOnce()
	})
})
