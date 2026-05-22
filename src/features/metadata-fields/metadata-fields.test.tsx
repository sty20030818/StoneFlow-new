import { fireEvent, render, screen } from '@testing-library/react'
import { CalendarIcon, FolderIcon, InboxIcon, TargetIcon } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import {
	createPlacementActionSpec,
	createSpaceActionSpec,
	createDueDateActionSpec,
	createPriorityActionSpec,
	createStatusActionSpec,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
	type MetadataPlacementValue,
} from '@/features/metadata-fields'

describe('metadata-fields', () => {
	it('createStatusActionSpec 输出统一 header、shortcut、placeholder 和顺序', () => {
		const spec = createStatusActionSpec()

		expect(spec.fieldKey).toBe('status')
		expect(spec.headerLabel).toBe('设置状态为...')
		expect(spec.headerShortcut).toBe('S')
		expect(spec.commandPlaceholder).toBe('选择状态…')
		expect(spec.options.map((option) => option.label)).toEqual([
			'待执行',
			'进行中',
			'等待中',
			'已完成',
			'已取消',
		])
		expect(spec.options.map((option) => option.digit)).toEqual(['1', '2', '3', '4', '5'])
	})

	it('createPriorityActionSpec 输出统一 header、shortcut、placeholder 和数字规则', () => {
		const spec = createPriorityActionSpec()

		expect(spec.fieldKey).toBe('priority')
		expect(spec.headerLabel).toBe('设置优先级为...')
		expect(spec.headerShortcut).toBe('P')
		expect(spec.commandPlaceholder).toBe('选择优先级…')
		expect(spec.options.map((option) => option.label)).toEqual(['无优先级', '紧急', '高', '中', '低'])
		expect(spec.options[0]).toMatchObject({
			value: 0,
			isEmptyValue: true,
			digit: '0',
		})
	})

	it('createDueDateActionSpec 输出统一日期动作语义', () => {
		const emptySpec = createDueDateActionSpec({
			currentValue: null,
			showClearOption: false,
		})

		expect(emptySpec.fieldKey).toBe('dueDate')
		expect(emptySpec.headerLabel).toBe('设置截止时间为...')
		expect(emptySpec.headerShortcut).toBe('D')
		expect(emptySpec.commandPlaceholder).toBe('选择截止时间…')
		expect(emptySpec.options.map((option) => option.label)).toEqual([
			'今天',
			'明天',
			'本周',
			'一周后',
			'自定义日期',
		])
		expect(emptySpec.options.at(-1)).toMatchObject({
			label: '自定义日期',
			action: 'openCustomDateDialog',
		})

		const valueSpec = createDueDateActionSpec({
			currentValue: '2026-05-08',
			showClearOption: true,
		})
		expect(valueSpec.options[0]).toMatchObject({
			label: '移除当前日期',
			value: null,
			isEmptyValue: true,
			digit: '0',
		})
	})

	it('createPlacementActionSpec 输出项目 placement 语义', () => {
		const spec = createPlacementActionSpec({
			projects: [{ id: 'project-1', name: '项目 A' }],
			includeInbox: true,
			labelMode: 'project',
		})

		expect(spec.fieldKey).toBe('project')
		expect(spec.headerLabel).toBe('移动到项目...')
		expect(spec.headerShortcut).toBe('⇧ P')
		expect(spec.commandPlaceholder).toBe('选择项目…')
		expect(spec.options.map((option) => option.label)).toEqual(['收件箱', '独立事项', '项目 A'])
		expect(spec.options[1]).toMatchObject({
			isEmptyValue: true,
			digit: '0',
		})
	})

	it('createPlacementActionSpec 输出父项目语义', () => {
		const spec = createPlacementActionSpec({
			projects: [{ id: 'project-1', name: '项目 A' }],
			labelMode: 'parentProject',
		})

		expect(spec.fieldKey).toBe('parentProject')
		expect(spec.headerLabel).toBe('设置父项目为...')
		expect(spec.headerShortcut).toBeUndefined()
		expect(spec.commandPlaceholder).toBe('选择父项目…')
		expect(spec.options.map((option) => option.label)).toEqual(['无父项目', '项目 A'])
	})

	it('createSpaceActionSpec 输出空间语义', () => {
		const spec = createSpaceActionSpec({
			spaces: [
				{ id: 'space-1', name: '工作' },
				{ id: 'space-2', name: '生活' },
			],
		})

		expect(spec.fieldKey).toBe('space')
		expect(spec.headerLabel).toBe('设置空间为...')
		expect(spec.headerShortcut).toBeUndefined()
		expect(spec.commandPlaceholder).toBe('选择空间…')
		expect(spec.options.map((option) => option.label)).toEqual(['工作', '生活'])
	})

	it('MetadataFieldDropdown 渲染统一 outline sm 按钮', () => {
		render(
			<MetadataFieldDropdown
				fieldKey='priority'
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

	it('MetadataFieldDropdown 优先使用显式 menuLabel 和 headerShortcut', async () => {
		render(
			<MetadataFieldDropdown
				fieldKey='status'
				headerShortcut='X'
				label='状态'
				menuLabel='显式标题'
				options={[
					{ value: 'todo', label: '待执行' },
					{ value: 'done', label: '已完成' },
				]}
				value='todo'
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		await screen.findByRole('menu')

		expect(screen.getByText('显式标题')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('X')
	})

	it('MetadataFieldDropdown 在未显式传入时仍保留 fieldKey fallback', async () => {
		render(
			<MetadataFieldDropdown
				fieldKey='project'
				label='项目'
				options={[
					{ value: 'a', label: '项目 A' },
					{ value: 'b', label: '项目 B' },
				]}
				value='a'
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '项目' }))
		await screen.findByRole('menu')

		expect(screen.getByText('移动到项目...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('⇧ P')
	})

	it('单选 checked indicator 正确显示', async () => {
		render(
			<MetadataFieldDropdown
				fieldKey='status'
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
				fieldKey='priority'
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

		expect(screen.getByText('设置优先级为...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('P')
		expect(getShortcutHintDigits()).toEqual(['0', '1'])

		fireEvent.keyDown(window, { key: '1' })

		expect(onChange).toHaveBeenCalledWith(2)
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('无空值时数字快捷键从 1 开始', async () => {
		render(
			<MetadataFieldDropdown
				fieldKey='status'
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

		expect(screen.getByText('设置状态为...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('S')
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

	it('MetadataDateDropdown 默认无值时不显示移除当前日期，且自定义日期可打开弹窗', async () => {
		render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='截止时间'
				value={null}
				onChange={() => undefined}
			/>,
		)

		expect(screen.getByRole('button', { name: '截止时间' })).toHaveTextContent('添加时间')
		fireEvent.pointerDown(screen.getByRole('button', { name: '截止时间' }))

		expect(screen.getByText('设置截止时间为...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('D')
		expect(screen.queryByRole('menuitem', { name: /移除当前日期/ })).not.toBeInTheDocument()
		expect(await screen.findByRole('menuitem', { name: /今天/ })).toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual([])
		expect(screen.getByRole('menuitem', { name: /明天/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /本周/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /一周后/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /自定义日期/ })).not.toHaveAttribute('data-disabled')
	})

	it('MetadataDateDropdown 有值时显示统一日期文案，并仅保留 0 快捷键', async () => {
		const onChange = vi.fn()
		render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='截止时间'
				value='2026-05-08'
				onChange={onChange}
			/>,
		)

		expect(screen.getByRole('button', { name: '截止时间' })).toHaveTextContent('截止 5/8')
		fireEvent.pointerDown(screen.getByRole('button', { name: '截止时间' }))
		expect(screen.getByText('设置截止时间为...')).toBeInTheDocument()
		expect(await screen.findByRole('menuitem', { name: /移除当前日期/ })).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('D')
		expect(getShortcutHintDigits()).toEqual(['0'])

		fireEvent.keyDown(window, { key: '1' })
		expect(onChange).not.toHaveBeenCalled()

		fireEvent.keyDown(window, { key: '0' })
		expect(onChange).toHaveBeenCalledWith(null)
	})

	it('MetadataDateDropdown 的计划时间和提醒时间仍保留各自 header', async () => {
		const firstRender = render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='计划时间'
				value={null}
				onChange={() => undefined}
			/>,
		)

		expect(screen.getByRole('button', { name: '计划时间' })).toHaveTextContent('添加时间')
		fireEvent.pointerDown(screen.getByRole('button', { name: '计划时间' }))
		await screen.findByRole('menu')
		expect(screen.getByText('设置计划时间为...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBeNull()

		firstRender.unmount()
		render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='提醒时间'
				value={null}
				onChange={() => undefined}
			/>,
		)

		expect(screen.getByRole('button', { name: '提醒时间' })).toHaveTextContent('添加时间')
		fireEvent.pointerDown(screen.getByRole('button', { name: '提醒时间' }))
		await screen.findByRole('menu')
		expect(screen.getByText('设置提醒时间为...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBeNull()
	})

	it('MetadataDateDropdown 无值时不显示移除当前日期且 0 不生效', async () => {
		const onChange = vi.fn()
		render(
			<MetadataDateDropdown
				icon={<CalendarIcon className='size-3.5' />}
				label='截止时间'
				value={null}
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '截止时间' }))
		expect(screen.getByText('设置截止时间为...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('D')
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
				label='项目'
				value={{ kind: 'inbox' }}
				options={options}
				onChange={() => undefined}
			/>,
		)

		expect(screen.getByRole('button', { name: '项目' })).toHaveTextContent('收件箱')

		rerender(
			<MetadataPlacementDropdown
				label='项目'
				value={{ kind: 'noProject' }}
				options={options}
				onChange={() => undefined}
			/>,
		)
		expect(screen.getByRole('button', { name: '项目' })).toHaveTextContent('独立事项')

		rerender(
			<MetadataPlacementDropdown
				label='项目'
				value={{ kind: 'project', projectId: 'project-1' }}
				options={options}
				onChange={() => undefined}
			/>,
		)
		expect(screen.getByRole('button', { name: '项目' })).toHaveTextContent('项目 A')

		rerender(
			<MetadataPlacementDropdown
				label='项目'
				value={{ kind: 'space', spaceId: 'space-1' }}
				options={options}
				onChange={() => undefined}
			/>,
		)
		expect(screen.getByRole('button', { name: '项目' })).toHaveTextContent('空间 A')

		fireEvent.pointerDown(screen.getByRole('button', { name: '项目' }))
		await screen.findByRole('menu')
		expect(screen.getByText('移动到项目...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('⇧ P')
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
		expect(screen.getByText('移动到项目...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('⇧ P')
		expect(getShortcutHintDigits()).toEqual(['0'])
	})

	it('MetadataPlacementDropdown 优先使用显式 menuLabel 和 headerShortcut', async () => {
		render(
			<MetadataPlacementDropdown
				headerShortcut='X'
				label='父项目'
				menuLabel='显式父项目标题'
				options={[
					{
						value: { kind: 'noProject' } satisfies MetadataPlacementValue,
						label: '无父项目',
						isEmptyValue: true,
					},
				]}
				value={{ kind: 'noProject' }}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '父项目' }))
		await screen.findByRole('menu')
		expect(screen.getByText('显式父项目标题')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('X')
	})
})

function getShortcutHintDigits() {
	return [...document.querySelectorAll('[data-slot="shortcut-menu-item-hint"]')].map(
		(item) => item.textContent,
	)
}

function getHeaderShortcutSummary() {
	return document.querySelector('[data-slot="metadata-field-menu-shortcut-summary"]')?.textContent ?? null
}
