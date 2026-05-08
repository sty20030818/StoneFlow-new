import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'

import { BoardRows } from '@/shared/ui/board'
import { RowShell } from '@/shared/ui/row'

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
			<BoardRows selectedIdSet={new Set(['row-b', 'row-c', 'row-d'])} getItemId={(_child, i) => items[i]?.id}>
				{items.map((item) => (
					<WrappedRow
						id={item.id}
						key={item.id}
						label={item.label}
						selected={item.selected}
					/>
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
		expect(last.className).toContain('bg-transparent')
		expect(last).toHaveAttribute('data-selection-group-position', 'last')
	})
})
