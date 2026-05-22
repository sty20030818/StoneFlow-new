import { fireEvent, render, screen } from '@testing-library/react'
import { CalendarIcon, FolderIcon, InboxIcon, TargetIcon } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import {
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
	type MetadataPlacementValue,
} from '@/features/metadata-fields'

describe('metadata-fields', () => {
	it('MetadataFieldDropdown 渲染统一 outline sm 按钮', () => {
		render(
			<MetadataFieldDropdown
				label='优先级'
				value={0}
				options={[
					{ value: 0, label: '无优先级', isEmptyValue: true },
					{ value: 2, label: '中' },
				]}
				onChange={() => undefined}
			/>,
		)

		const button = screen.getByRole('button', { name: '优先级' })
		expect(button).toHaveAttribute('data-variant', 'outline')
		expect(button).toHaveAttribute('data-size', 'sm')
		expect(button).toHaveTextContent('无优先级')
	})

	it('单选 checked indicator 正确显示', async () => {
		render(
			<MetadataFieldDropdown
				label='状态'
				value='todo'
				options={[
					{ value: 'todo', label: '待执行' },
					{ value: 'done', label: '已完成' },
				]}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))

		const selectedItem = await screen.findByRole('menuitem', { name: /待执行/ })
		expect(selectedItem.querySelector('[data-slot="metadata-field-indicator"]')).not.toHaveClass(
			'invisible',
		)
	})

	it('多值 mixed indicator 正确显示', async () => {
		render(
			<MetadataFieldDropdown
				label='状态'
				value='todo'
				values={['todo', 'done']}
				options={[
					{ value: 'todo', label: '待执行' },
					{ value: 'done', label: '已完成' },
				]}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))

		const selectedItem = await screen.findByRole('menuitem', { name: /待执行/ })
		expect(selectedItem.querySelector('svg[data-slot="metadata-field-indicator"]')).not.toHaveClass(
			'invisible',
		)
	})

	it('空值从 0 开始，普通选项从 1 开始，并支持数字选择关闭菜单', async () => {
		const onChange = vi.fn()

		render(
			<MetadataFieldDropdown
				label='优先级'
				value={0}
				options={[
					{ value: 0, label: '无优先级', isEmptyValue: true },
					{ value: 2, label: '中' },
				]}
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '优先级' }))
		await screen.findByRole('menu')

		expect(getShortcutHintDigits()).toEqual(['0', '1'])

		fireEvent.keyDown(window, { key: '1' })

		expect(onChange).toHaveBeenCalledWith(2)
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('无空值时数字快捷键从 1 开始', async () => {
		render(
			<MetadataFieldDropdown
				label='状态'
				value='todo'
				options={[
					{ value: 'todo', label: '待执行' },
					{ value: 'done', label: '已完成' },
				]}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		await screen.findByRole('menu')

		expect(getShortcutHintDigits()).toEqual(['1', '2'])
	})

	it('stopPropagation=true 时不会冒泡到父级 click', async () => {
		const onParentClick = vi.fn()

		render(
			<div onClick={onParentClick}>
				<MetadataFieldDropdown
					label='状态'
					value='todo'
					stopPropagation
					options={[
						{ value: 'todo', label: '待执行' },
						{ value: 'done', label: '已完成' },
					]}
					onChange={() => undefined}
				/>
			</div>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /已完成/ }))

		expect(onParentClick).not.toHaveBeenCalled()
	})

	it('drawerOwnedOverlay=true 时 content 带 drawer overlay 归属标记', async () => {
		render(
			<MetadataFieldDropdown
				drawerOwnedOverlay
				label='状态'
				value='todo'
				options={[
					{ value: 'todo', label: '待执行' },
					{ value: 'done', label: '已完成' },
				]}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		const menu = await screen.findByRole('menu')

		expect(menu).toHaveAttribute('data-drawer-owned-overlay', 'true')
	})

	it('row icon-only trigger 不显示文字标签', () => {
		render(
			<MetadataFieldDropdown
				buttonAppearance='row-icon'
				label='优先级'
				value={2}
				options={[
					{ value: 0, label: '无优先级', isEmptyValue: true },
					{ value: 2, label: '中', icon: <span>2</span> },
				]}
				onChange={() => undefined}
			/>,
		)

		const button = screen.getByRole('button', { name: '优先级' })
		expect(button).not.toHaveTextContent('优先级')
		expect(button.querySelector('.sr-only')).toHaveTextContent('中')
	})

	it('MetadataDateDropdown 默认无值时不显示移除当前日期，且自定义日期禁用', async () => {
		render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='截止'
				value={null}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '截止' }))

		expect(screen.queryByRole('menuitem', { name: /移除当前日期/ })).not.toBeInTheDocument()
		expect(await screen.findByRole('menuitem', { name: /今天/ })).toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual([])
		expect(screen.getByRole('menuitem', { name: /明天/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /本周/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /一周后/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /自定义日期/ })).toHaveAttribute('data-disabled')
		expect(screen.getByRole('menuitem', { name: /自定义日期/ })).toHaveTextContent('后续接入')
	})

	it('MetadataDateDropdown 有值时显示统一日期文案，并仅保留 0 快捷键', async () => {
		const onChange = vi.fn()
		render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='截止'
				value='2026-05-08'
				onChange={onChange}
			/>,
		)

		expect(screen.getByRole('button', { name: '截止' })).toHaveTextContent('截止 5/8')
		fireEvent.pointerDown(screen.getByRole('button', { name: '截止' }))
		expect(await screen.findByRole('menuitem', { name: /移除当前日期/ })).toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual(['0'])

		fireEvent.keyDown(window, { key: '1' })
		expect(onChange).not.toHaveBeenCalled()

		fireEvent.keyDown(window, { key: '0' })
		expect(onChange).toHaveBeenCalledWith(null)
	})

	it('MetadataDateDropdown 无值时不显示移除当前日期且 0 不生效', async () => {
		const onChange = vi.fn()
		render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='截止'
				value={null}
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '截止' }))
		expect(screen.queryByRole('menuitem', { name: /移除当前日期/ })).not.toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual([])

		fireEvent.keyDown(window, { key: '0' })
		expect(onChange).not.toHaveBeenCalled()
	})

	it('MetadataPlacementDropdown 能识别 inbox / noProject / project / space 当前值', async () => {
		const options = [
			{
				value: { kind: 'inbox' } satisfies MetadataPlacementValue,
				label: '收件箱',
				icon: <InboxIcon className='size-3.5' />,
			},
			{
				value: { kind: 'noProject' } satisfies MetadataPlacementValue,
				label: '独立事项',
				icon: <TargetIcon className='size-3.5' />,
				isEmptyValue: true,
			},
			{
				value: { kind: 'project', projectId: 'project-1' } satisfies MetadataPlacementValue,
				label: '项目 A',
				icon: <FolderIcon className='size-3.5' />,
			},
			{
				value: { kind: 'space', spaceId: 'space-1' } satisfies MetadataPlacementValue,
				label: '空间 A',
			},
		]
		const { rerender } = render(
			<MetadataPlacementDropdown
				label='归属'
				value={{ kind: 'inbox' }}
				options={options}
				onChange={() => undefined}
			/>,
		)

		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('收件箱')

		rerender(
			<MetadataPlacementDropdown
				label='归属'
				value={{ kind: 'noProject' }}
				options={options}
				onChange={() => undefined}
			/>,
		)
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('独立事项')

		rerender(
			<MetadataPlacementDropdown
				label='归属'
				value={{ kind: 'project', projectId: 'project-1' }}
				options={options}
				onChange={() => undefined}
			/>,
		)
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('项目 A')

		rerender(
			<MetadataPlacementDropdown
				label='归属'
				value={{ kind: 'space', spaceId: 'space-1' }}
				options={options}
				onChange={() => undefined}
			/>,
		)
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('空间 A')

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		await screen.findByRole('menu')
		expect(getShortcutHintDigits()).toEqual(['0'])
	})

	it('MetadataPlacementDropdown 仅独立事项显示 0', async () => {
		render(
			<MetadataPlacementDropdown
				label='项目'
				options={[
					{
						value: { kind: 'noProject' } satisfies MetadataPlacementValue,
						label: '独立事项',
						isEmptyValue: true,
					},
					{
						value: { kind: 'project', projectId: 'project-1' } satisfies MetadataPlacementValue,
						label: '项目 A',
					},
				]}
				value={{ kind: 'project', projectId: 'project-1' }}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '项目' }))
		await screen.findByRole('menu')
		expect(getShortcutHintDigits()).toEqual(['0'])
	})
})

function getShortcutHintDigits() {
	return [...document.querySelectorAll('[data-slot="shortcut-menu-item-hint"]')].map(
		(item) => item.textContent,
	)
}
