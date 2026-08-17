import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { ListView } from '@heroui-pro/react/list-view'
import { Button } from '@heroui/react'

const FLAT_ITEMS = [
	{ id: 'task-a', title: '任务 A' },
	{ id: 'task-b', title: '任务 B' },
	{ id: 'task-c', title: '任务 C' },
] as const

type PublicListViewProps = ListView['Props']

describe('CollectionInteractionContract', () => {
	it('direct ListView 适合标准平面合同：提供可访问名称、grid-row-cell 与 Arrow/Home/End', () => {
		render(<FlatListViewProbe />)

		const grid = screen.getByRole('grid', { name: '标准平面任务' })
		const rows = within(grid).getAllByRole('row')
		expect(rows).toHaveLength(FLAT_ITEMS.length)
		for (const row of rows) {
			expect(within(row).getByRole('gridcell')).toBeInTheDocument()
		}

		act(() => rows[0].focus())
		expect(rows[0]).toHaveFocus()

		fireEvent.keyDown(rows[0], { key: 'ArrowDown' })
		expect(rows[1]).toHaveFocus()

		fireEvent.keyDown(rows[1], { key: 'End' })
		expect(rows[2]).toHaveFocus()

		fireEvent.keyDown(rows[2], { key: 'Home' })
		expect(rows[0]).toHaveFocus()
	})

	it('direct ListView 的公开 selection 与 row action 可独立工作', () => {
		const onSelectionChange = vi.fn()
		const onRowAction = vi.fn()
		render(<FlatListViewProbe onRowAction={onRowAction} onSelectionChange={onSelectionChange} />)
		const firstRow = screen.getAllByRole('row')[0]
		act(() => firstRow.focus())
		fireEvent.keyDown(firstRow, { code: 'Enter', key: 'Enter' })
		fireEvent.keyUp(firstRow, { code: 'Enter', key: 'Enter' })

		expect(onRowAction).toHaveBeenCalledWith('task-a')
		expect(onSelectionChange).not.toHaveBeenCalled()

		onRowAction.mockClear()
		const selectionControl = within(firstRow).getByRole('checkbox')
		fireEvent.click(selectionControl)

		expect(onSelectionChange).toHaveBeenCalledTimes(1)
		expect([...onSelectionChange.mock.calls[0][0]]).toEqual(['task-a'])
		expect(onRowAction).not.toHaveBeenCalled()
	})

	it('行内 HeroUI Button 只执行自身动作，不触发 row action 或 selection', () => {
		const onInlineAction = vi.fn()
		const onRowAction = vi.fn()
		const onSelectionChange = vi.fn()
		render(
			<FlatListViewProbe
				onInlineAction={onInlineAction}
				onRowAction={onRowAction}
				onSelectionChange={onSelectionChange}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '编辑任务 A' }))

		expect(onInlineAction).toHaveBeenCalledWith('task-a')
		expect(onRowAction).not.toHaveBeenCalled()
		expect(onSelectionChange).not.toHaveBeenCalled()
	})

	it('direct ListView 不提供 Linear J 键位且全选暴露 all sentinel，产品合同必须下沉 hooks', () => {
		const onSelectionChange = vi.fn()
		render(<FlatListViewProbe onSelectionChange={onSelectionChange} />)
		const firstRow = screen.getAllByRole('row')[0]
		act(() => firstRow.focus())
		onSelectionChange.mockClear()

		fireEvent.keyDown(firstRow, { key: 'j' })
		expect(firstRow).toHaveFocus()

		firePlatformSelectAll(firstRow, onSelectionChange)

		expect(onSelectionChange).toHaveBeenCalledWith('all')
	})

	it('ListView 的 public virtualized 代表其自有虚拟化边界，不与产品几何叠加', () => {
		const virtualizedProps = {
			virtualized: true,
			rowHeight: 44,
		} satisfies Pick<PublicListViewProps, 'virtualized' | 'rowHeight'>

		render(<FlatListViewProbe {...virtualizedProps} />)

		expect(screen.getByRole('grid', { name: '标准平面任务' })).toBeInTheDocument()
	})
})

type FlatListViewProbeProps = Partial<Pick<PublicListViewProps, 'rowHeight' | 'virtualized'>> & {
	onInlineAction?: (key: string) => void
	onRowAction?: (key: React.Key) => void
	onSelectionChange?: (keys: 'all' | Set<React.Key>) => void
}

function FlatListViewProbe({
	onInlineAction,
	onRowAction,
	onSelectionChange,
	rowHeight,
	virtualized,
}: FlatListViewProbeProps) {
	return (
		<ListView
			aria-label='标准平面任务'
			onAction={onRowAction}
			onSelectionChange={onSelectionChange}
			rowHeight={rowHeight}
			selectionMode='multiple'
			virtualized={virtualized}
		>
			{FLAT_ITEMS.map((item) => (
				<ListView.Item id={item.id} key={item.id} textValue={item.title}>
					<ListView.ItemContent>
						<ListView.Title>{item.title}</ListView.Title>
					</ListView.ItemContent>
					<ListView.ItemAction>
						<Button
							aria-label={`编辑${item.title}`}
							onPress={() => onInlineAction?.(item.id)}
							variant='ghost'
						>
							编辑
						</Button>
					</ListView.ItemAction>
				</ListView.Item>
			))}
		</ListView>
	)
}

function firePlatformSelectAll(element: HTMLElement, onSelectionChange: ReturnType<typeof vi.fn>) {
	fireEvent.keyDown(element, { key: 'a', ctrlKey: true })
	if (onSelectionChange.mock.calls.length === 0) {
		fireEvent.keyDown(element, { key: 'a', metaKey: true })
	}
}
