import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import {
	CustomDateDialog,
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

		fireEvent.click(screen.getByRole('button', { name: '优先级' }))
		expect(await screen.findByText('设置优先级为...')).toBeInTheDocument()
		fireEvent.keyDown(window, { key: '1' })

		expect(onChange).toHaveBeenCalledWith(2)
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
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

		fireEvent.click(screen.getByRole('button', { name: '截止时间' }))
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
		fireEvent.click(screen.getByRole('button', { name: '截止时间' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /自定义日期/ }))

		expect(useDialogStore.getState().customDateDialog).toMatchObject({
			label: '截止时间',
			value: null,
			hasExistingValue: false,
		})
	})

	it('自定义日期日历只修改弹窗草稿，保存时提交 date-only 领域值', () => {
		const onOpenChange = vi.fn()
		const onSubmit = vi.fn()

		render(
			<CustomDateDialog
				hasExistingValue
				label='截止时间'
				onOpenChange={onOpenChange}
				onSubmit={onSubmit}
				open
				value='2026-05-10'
			/>,
		)

		fireEvent.click(within(screen.getByRole('grid')).getByText('20'))
		expect(onSubmit).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('button', { name: '保存截止时间' }))

		expect(onSubmit).toHaveBeenCalledWith('2026-05-20')
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('取消与 Escape 丢弃日历草稿，重开恢复已保存日期', async () => {
		const onSubmit = vi.fn()
		render(<CustomDateDialogHarness onSubmit={onSubmit} />)

		fireEvent.click(screen.getByRole('button', { name: '打开日期弹窗' }))
		fireEvent.click(within(screen.getByRole('grid')).getByText('20'))
		fireEvent.click(screen.getByRole('button', { name: '取消' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		fireEvent.click(screen.getByRole('button', { name: '打开日期弹窗' }))
		expect(
			within(screen.getByRole('grid')).getByRole('gridcell', { name: '10', selected: true }),
		).toBeInTheDocument()
		fireEvent.click(within(screen.getByRole('grid')).getByText('20'))
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		fireEvent.click(screen.getByRole('button', { name: '打开日期弹窗' }))
		expect(
			within(screen.getByRole('grid')).getByRole('gridcell', { name: '10', selected: true }),
		).toBeInTheDocument()
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('移除自定义日期提交 null，并在重开后保持空草稿', async () => {
		const onSubmit = vi.fn()
		render(<CustomDateDialogHarness onSubmit={onSubmit} />)

		fireEvent.click(screen.getByRole('button', { name: '打开日期弹窗' }))
		fireEvent.click(screen.getByRole('button', { name: '移除截止时间' }))

		expect(onSubmit).toHaveBeenCalledWith(null)
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		fireEvent.click(screen.getByRole('button', { name: '打开日期弹窗' }))
		expect(screen.getByRole('button', { name: '保存截止时间' })).toBeDisabled()
		expect(screen.queryByRole('button', { name: '移除截止时间' })).not.toBeInTheDocument()
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

		fireEvent.click(screen.getByRole('button', { name: '归属' }))
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

function CustomDateDialogHarness({ onSubmit }: { onSubmit: (value: string | null) => void }) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState<string | null>('2026-05-10')

	return (
		<>
			<button type='button' onClick={() => setOpen(true)}>
				打开日期弹窗
			</button>
			<CustomDateDialog
				hasExistingValue={value !== null}
				label='截止时间'
				onOpenChange={setOpen}
				onSubmit={(nextValue) => {
					setValue(nextValue)
					onSubmit(nextValue)
				}}
				open={open}
				value={value}
			/>
		</>
	)
}
