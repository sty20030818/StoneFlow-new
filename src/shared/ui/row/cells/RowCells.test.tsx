import { fireEvent, render, screen } from '@testing-library/react'

import {
	CreatedAtCell,
	DueDateCell,
	PriorityCell,
	ProjectCell,
	RestoreActionCell,
	StatusCell,
	TagsCell,
} from '@/shared/ui/row'

describe('Row Cells', () => {
	it('PriorityCell 触发回调且不冒泡', async () => {
		const onParentClick = vi.fn()
		const onChange = vi.fn()

		render(
			<div onClick={onParentClick}>
				<PriorityCell
					ariaLabel='优先级'
					onChange={onChange}
					options={[
						{ value: 0, label: '无优先级', icon: <span>0</span> },
						{ value: 2, label: '中', icon: <span>2</span> },
					]}
					value={0}
				/>
			</div>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '优先级' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /中/ }))

		expect(onChange).toHaveBeenCalledWith(2)
		expect(onParentClick).not.toHaveBeenCalled()
	})

	it('StatusCell 触发回调且不冒泡', async () => {
		const onParentClick = vi.fn()
		const onChange = vi.fn()

		render(
			<div onClick={onParentClick}>
				<StatusCell
					ariaLabel='状态'
					onChange={onChange}
					options={[
						{ value: 'todo', label: '待执行', icon: <span>T</span> },
						{ value: 'done', label: '已完成', icon: <span>D</span> },
					]}
					value='todo'
				/>
			</div>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /已完成/ }))

		expect(onChange).toHaveBeenCalledWith('done')
		expect(onParentClick).not.toHaveBeenCalled()
	})

	it('ProjectCell 触发选择回调且不冒泡', async () => {
		const onParentClick = vi.fn()
		const onSelectProject = vi.fn()

		render(
			<div onClick={onParentClick}>
				<ProjectCell
					onSelectProject={onSelectProject}
					onSelectNone={() => undefined}
					options={[
						{ id: 'p1', name: '项目 A' },
						{ id: 'p2', name: '项目 B' },
					]}
					projectName='项目 A'
				/>
			</div>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: /项目 A/ }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))

		expect(onSelectProject).toHaveBeenCalledWith('p2')
		expect(onParentClick).not.toHaveBeenCalled()
	})

	it('CreatedAtCell 使用 formatter 渲染', () => {
		render(<CreatedAtCell formatter={() => '5/7'} value='2026-05-07T10:00:00Z' />)
		expect(screen.getByRole('button', { name: /5\/7/ })).toBeInTheDocument()
	})

	it('DueDateCell 与 TagsCell 渲染占位', () => {
		render(
			<div>
				<DueDateCell value={null} />
				<TagsCell />
			</div>,
		)

		expect(screen.getByRole('button', { name: /截止/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /标签/ })).toBeInTheDocument()
	})

	it('RestoreActionCell 点击与禁用态可用', () => {
		const onRestore = vi.fn()
		const { rerender } = render(<RestoreActionCell onRestore={onRestore} />)

		fireEvent.click(screen.getByRole('button', { name: '恢复' }))
		expect(onRestore).toHaveBeenCalledTimes(1)

		rerender(<RestoreActionCell disabled onRestore={onRestore} />)
		expect(screen.getByRole('button', { name: '恢复' })).toBeDisabled()
	})
})
