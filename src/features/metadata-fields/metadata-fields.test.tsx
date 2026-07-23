import { fireEvent, render, screen } from '@testing-library/react'
import { CalendarIcon } from 'lucide-react'

import {
	createDueDateActionSpec,
	createProjectParentMetadataDropdownProps,
	createTaskPlacementGroupedDropdownProps,
	createPriorityActionSpec,
	createStatusActionSpec,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
} from '@/features/metadata-fields'
import { createParentProjectActionSpec } from './core'

describe('metadata-fields', () => {
	it('status / priority / dueDate action spec 输出最终文案和数字规则', () => {
		expect(createStatusActionSpec().options.map((option) => option.digit)).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
		])
		expect(createPriorityActionSpec().options.map((option) => option.digit)).toEqual([
			'0',
			'1',
			'2',
			'3',
			'4',
		])
		expect(
			createDueDateActionSpec({
				currentValue: '2026-05-08',
				showClearOption: true,
			}).options[0],
		).toMatchObject({
			label: '移除当前日期',
			digit: '0',
			isEmptyValue: true,
		})
	})

	it('父项目选择回到 generic MetadataFieldDropdown', async () => {
		const props = createProjectParentMetadataDropdownProps([{ id: 'project-1', name: '项目 A' }])
		const onChange = vi.fn()

		render(
			<MetadataFieldDropdown
				fieldKey='parentProject'
				headerShortcut={props.headerShortcut}
				label='父项目'
				menuLabel={props.menuLabel}
				options={props.options}
				value=''
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '父项目' }))
		expect(await screen.findByText('设置父项目为...')).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /无父项目/ })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('menuitem', { name: /项目 A/ }))
		expect(onChange).toHaveBeenCalledWith('project-1')
	})

	it('generic dropdown 继续保留 fieldKey fallback 和数字快捷键', async () => {
		const onChange = vi.fn()

		render(
			<MetadataFieldDropdown
				fieldKey='priority'
				label='优先级'
				options={[
					{ value: 0, label: '无优先级', isEmptyValue: true },
					{ value: 2, label: '中' },
				]}
				value={0}
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '优先级' }))
		expect(await screen.findByText('设置优先级为...')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('P')
		expect(getShortcutHintDigits()).toEqual(['0', '1'])

		fireEvent.keyDown(window, { key: '1' })
		expect(onChange).toHaveBeenCalledWith(2)
	})

	it('MetadataDateDropdown 保持 clear-only 语义和 drawer overlay 标记', async () => {
		const onChange = vi.fn()

		render(
			<MetadataDateDropdown
				drawerOwnedOverlay
				icon={<CalendarIcon className='size-3.5' />}
				label='截止时间'
				value='2026-05-08'
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '截止时间' }))
		const menu = await screen.findByRole('menu')
		expect(menu).toHaveAttribute('data-drawer-owned-overlay', 'true')
		expect(screen.getByRole('menuitem', { name: /移除当前日期/ })).toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual(['0'])

		fireEvent.keyDown(window, { key: '0' })
		expect(onChange).toHaveBeenCalledWith(null)
	})

	it('Task placement grouped dropdown 在 global 模式下显示每个 space 的 standalone / project', async () => {
		const groupedProps = createTaskPlacementGroupedDropdownProps({
			mode: 'global',
			currentSpaceId: 'space-a',
			spaces: [
				{ id: 'space-a', name: '工作' },
				{ id: 'space-b', name: '生活' },
			],
			projects: [
				{ id: 'project-a', name: '项目 A', spaceId: 'space-a' },
				{ id: 'project-b', name: '项目 B', spaceId: 'space-b' },
			],
		})

		render(
			<MetadataPlacementDropdown
				groups={groupedProps.groups}
				headerShortcut={groupedProps.headerShortcut}
				label='归属'
				menuLabel={groupedProps.menuLabel}
				value={{ kind: 'project', spaceId: 'space-b', projectId: 'project-b' }}
				onChange={() => undefined}
			/>,
		)

		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('项目 B')
		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))

		expect(await screen.findByText('工作')).toBeInTheDocument()
		expect(screen.getByText('生活')).toBeInTheDocument()
		expect(screen.getAllByRole('menuitem', { name: /独立事项/ })).toHaveLength(2)
		expect(screen.getByRole('menuitem', { name: /项目 A/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /项目 B/ })).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('⇧ P')
	})

	it('Task placement grouped dropdown 支持 standalone 当前值、mixed indicator 和 clear-only digit', async () => {
		const groupedProps = createTaskPlacementGroupedDropdownProps({
			mode: 'local',
			currentSpaceId: 'space-a',
			spaces: [{ id: 'space-a', name: '工作' }],
			projects: [{ id: 'project-a', name: '项目 A', spaceId: 'space-a' }],
		})

		render(
			<MetadataPlacementDropdown
				groups={groupedProps.groups}
				label='归属'
				value={{ kind: 'standalone', spaceId: 'space-a' }}
				values={[
					{ kind: 'standalone', spaceId: 'space-a' },
					{ kind: 'project', spaceId: 'space-a', projectId: 'project-a' },
				]}
				onChange={() => undefined}
			/>,
		)

		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('独立事项')
		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))

		expect(getShortcutHintDigits()).toEqual(['0'])
		expect(getIndicatorState('独立事项')).toBe('mixed')
		expect(getIndicatorState('项目 A')).toBe('mixed')
	})

	it('Task placement grouped dropdown 显式 header 优先级高于默认值', async () => {
		const groupedProps = createTaskPlacementGroupedDropdownProps({
			mode: 'local',
			currentSpaceId: 'space-a',
			spaces: [{ id: 'space-a', name: '工作' }],
			projects: [],
		})

		render(
			<MetadataPlacementDropdown
				drawerOwnedOverlay
				groups={groupedProps.groups}
				headerShortcut='X'
				label='归属'
				menuAlign='end'
				menuLabel='显式标题'
				stopPropagation
				value={{ kind: 'standalone', spaceId: 'space-a' }}
				onChange={() => undefined}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		const menu = await screen.findByRole('menu')
		expect(menu).toHaveAttribute('data-drawer-owned-overlay', 'true')
		expect(screen.getByText('显式标题')).toBeInTheDocument()
		expect(getHeaderShortcutSummary()).toBe('X')
	})

	it('parent project action spec 只保留 generic 语义', () => {
		expect(
			createParentProjectActionSpec({ projects: [{ id: 'project-1', name: '项目 A' }] }),
		).toMatchObject({
			fieldKey: 'parentProject',
			headerLabel: '设置父项目为...',
			commandPlaceholder: '选择父项目…',
		})
	})
})

function getShortcutHintDigits() {
	return [...document.querySelectorAll('[data-slot="shortcut-menu-item-hint"]')].map(
		(item) => item.textContent,
	)
}

function getHeaderShortcutSummary() {
	return (
		document.querySelector('[data-slot="metadata-field-menu-shortcut-summary"]')?.textContent ??
		null
	)
}

function getIndicatorState(label: string) {
	const item = screen.getByRole('menuitem', { name: new RegExp(label) })
	return item
		.querySelector('[data-slot="metadata-field-indicator"]')
		?.getAttribute('data-indicator')
}
