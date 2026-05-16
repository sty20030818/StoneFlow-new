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

	it('PriorityCell 有空态时从 0 开始并支持数字选择', async () => {
		const onChange = vi.fn()

		render(
			<PriorityCell
				ariaLabel='优先级'
				onChange={onChange}
				options={[
					{ value: 0, label: '无优先级', icon: <span>0</span> },
					{ value: 2, label: '中', icon: <span>2</span> },
				]}
				value={0}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '优先级' }))
		await screen.findByRole('menu')
		expect(getShortcutHintDigits()).toEqual(['0', '1'])

		fireEvent.keyDown(screen.getByRole('menu'), { key: '1' })

		expect(onChange).toHaveBeenCalledWith(2)
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		fireEvent.keyDown(document.body, { key: '0' })
		expect(onChange).toHaveBeenCalledTimes(1)
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

	it('StatusCell 无空态时从 1 开始并忽略超出范围数字', async () => {
		const onChange = vi.fn()

		render(
			<StatusCell
				ariaLabel='状态'
				onChange={onChange}
				options={[
					{ value: 'todo', label: '待执行', icon: <span>T</span> },
					{ value: 'done', label: '已完成', icon: <span>D</span> },
				]}
				value='todo'
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		await screen.findByRole('menu')
		expect(getShortcutHintDigits()).toEqual(['1', '2'])

		fireEvent.keyDown(screen.getByRole('menu'), { key: '0' })
		expect(onChange).not.toHaveBeenCalled()

		fireEvent.keyDown(screen.getByRole('menu'), { key: '2' })
		expect(onChange).toHaveBeenCalledWith('done')
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

	it('ProjectCell 有空态时从 0 开始并支持数字选择', async () => {
		const onSelectNone = vi.fn()
		const onSelectProject = vi.fn()

		render(
			<ProjectCell
				onSelectNone={onSelectNone}
				onSelectProject={onSelectProject}
				options={[
					{ id: 'p1', name: '项目 A' },
					{ id: 'p2', name: '项目 B' },
				]}
				projectName='项目 A'
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: /项目 A/ }))
		await screen.findByRole('menu')
		expect(getShortcutHintDigits()).toEqual(['0', '1', '2'])

		fireEvent.keyDown(screen.getByRole('menu'), { key: '0' })
		expect(onSelectNone).toHaveBeenCalledTimes(1)

		fireEvent.pointerDown(screen.getByRole('button', { name: /项目 A/ }))
		fireEvent.keyDown(await screen.findByRole('menu'), { key: '2' })
		expect(onSelectProject).toHaveBeenCalledWith('p2')
	})

	it('CreatedAtCell 使用 formatter 渲染', () => {
		render(<CreatedAtCell formatter={() => '5/7'} value='2026-05-07T10:00:00Z' />)
		expect(screen.getByText('5/7')).toBeInTheDocument()
	})

	it('DueDateCell 与 TagsCell 无值时不渲染占位', () => {
		render(
			<div>
				<DueDateCell value={null} />
				<TagsCell />
			</div>,
		)

		expect(screen.queryByRole('button', { name: /截止/ })).not.toBeInTheDocument()
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
})

function getShortcutHintDigits() {
	return [...document.querySelectorAll('[data-slot="shortcut-menu-item-hint"]')].map(
		(item) => item.textContent,
	)
}
