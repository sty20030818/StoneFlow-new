import { CalendarIcon } from 'lucide-react'
import { act, fireEvent, render, screen } from '@testing-library/react'

import {
	createTaskPlacementGroupedDropdownProps,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
} from '@/features/metadata-fields'
import { useDialogStore } from '@/features/shell-dialogs'

describe('metadata-fields', () => {
	beforeEach(() => {
		useDialogStore.setState({ customDateDialog: null })
	})

	it('generic dropdown 用菜单语义与数字键提交唯一值', async () => {
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
		fireEvent.keyDown(window, { key: '1' })

		expect(onChange).toHaveBeenCalledWith(2)
	})

	it('禁用字段保留上下文名称，并向键盘用户说明原因', async () => {
		render(
			<MetadataFieldDropdown
				ariaLabel='修改优先级：任务 A'
				buttonAppearance='row-icon'
				disabled
				disabledReason='正在更新任务，暂时无法修改优先级'
				label='优先级'
				options={[{ value: 0, label: '无优先级' }]}
				tooltipLabel='修改优先级'
				value={0}
				onChange={() => undefined}
			/>,
		)

		const trigger = screen.getByRole('group', { name: '修改优先级：任务 A' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())

		expect(await screen.findByRole('tooltip')).toHaveTextContent(
			'修改优先级正在更新任务，暂时无法修改优先级',
		)
		expect(screen.getByRole('button', { name: '修改优先级：任务 A' })).toBeDisabled()
	})

	it('日期字段分别把清空与自定义日期交给正确入口', async () => {
		const onChange = vi.fn()
		const view = render(
			<MetadataDateDropdown
				icon={<CalendarIcon />}
				label='截止时间'
				value='2026-05-08'
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '截止时间' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /移除当前日期/ }))
		expect(onChange).toHaveBeenCalledWith(null)

		view.rerender(
			<MetadataDateDropdown
				icon={<CalendarIcon />}
				label='截止时间'
				value={null}
				onChange={onChange}
			/>,
		)
		fireEvent.pointerDown(screen.getByRole('button', { name: '截止时间' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /自定义日期/ }))

		expect(useDialogStore.getState().customDateDialog).toMatchObject({
			fieldKey: 'dueDate',
			label: '截止时间',
			value: null,
			hasExistingValue: false,
		})
	})

	it('grouped placement 按 Space 呈现，并返回 stable target', async () => {
		const onChange = vi.fn()
		const grouped = createTaskPlacementGroupedDropdownProps({
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
				groups={grouped.groups}
				label='归属'
				menuLabel={grouped.menuLabel}
				value={{ kind: 'project', spaceId: 'space-b', projectId: 'project-b' }}
				onChange={onChange}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		expect(await screen.findByText('工作')).toBeInTheDocument()
		expect(screen.getByText('生活')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('menuitem', { name: /项目 A/ }))

		expect(onChange).toHaveBeenCalledWith({
			kind: 'project',
			spaceId: 'space-a',
			projectId: 'project-a',
		})
	})
})
