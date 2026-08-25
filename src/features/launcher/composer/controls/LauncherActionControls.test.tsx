import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { getLauncherDatePreset } from '../../model/launcherFormatters'
import type { LauncherPriority, LauncherSpaceSummary } from '../../model/types'

import { PriorityControl } from './PriorityControl'
import { DateControl } from './DateControl'
import { SpaceControl } from './SpaceControl'

const SPACES: LauncherSpaceSummary[] = [
	{
		id: 'space-1',
		name: '产品研发',
		iconKey: 'briefcase',
		colorKey: 'blue',
		isDefault: true,
	},
	{
		id: 'space-2',
		name: '工程基础',
		iconKey: 'sparkles',
		colorKey: 'amber',
		isDefault: false,
	},
]

describe('Launcher icon action controls', () => {
	it('选择优先级和 Space 时回传领域值', async () => {
		const onPriorityChange = vi.fn()
		const onSelectSpace = vi.fn()
		renderControl(
			<ControlsHarness onPriorityChange={onPriorityChange} onSelectSpace={onSelectSpace} />,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '优先级' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '高' }))
		expect(onPriorityChange).toHaveBeenCalledWith(3)

		fireEvent.pointerDown(screen.getByRole('button', { name: '空间选择' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '工程基础' }))
		expect(onSelectSpace).toHaveBeenCalledWith('space-2')
	})

	it('创建中禁用优先级动作并保留可解释的可访问外壳', () => {
		renderControl(<PriorityControlHarness disabled />)

		expect(screen.getByRole('group', { name: '设置优先级' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '优先级' })).toBeDisabled()
	})

	it('从 Launcher 日历选择日期后立即回传 date-only 领域值', async () => {
		const onDateChange = vi.fn()
		renderControl(<DateControlHarness onDateChange={onDateChange} />)

		fireEvent.click(screen.getByRole('button', { name: /截止 5\/10/ }))
		const calendar = await screen.findByRole('grid')
		fireEvent.click(within(calendar).getByText('20'))

		expect(onDateChange).toHaveBeenCalledWith('dueAt', '2026-05-20')
		expect(
			within(calendar).getByRole('gridcell', { name: '20', selected: true }),
		).toBeInTheDocument()
	})

	it('Launcher 日期预设与清除继续写入同一草稿入口', async () => {
		const onDateChange = vi.fn()
		const referenceDate = new Date()
		renderControl(<DateControlHarness onDateChange={onDateChange} />)

		fireEvent.click(screen.getByRole('button', { name: /截止 5\/10/ }))
		fireEvent.click(await screen.findByRole('button', { name: '今天' }))
		expect(onDateChange).toHaveBeenLastCalledWith(
			'dueAt',
			getLauncherDatePreset('today', referenceDate),
		)

		fireEvent.click(screen.getByRole('button', { name: '明天' }))
		expect(onDateChange).toHaveBeenLastCalledWith(
			'dueAt',
			getLauncherDatePreset('tomorrow', referenceDate),
		)

		fireEvent.click(screen.getByRole('button', { name: '本周' }))
		expect(onDateChange).toHaveBeenLastCalledWith(
			'dueAt',
			getLauncherDatePreset('week', referenceDate),
		)

		fireEvent.click(screen.getByRole('button', { name: '清除' }))
		expect(onDateChange).toHaveBeenLastCalledWith('dueAt', null)
	})
})

function DateControlHarness({
	onDateChange,
}: {
	onDateChange: (field: 'dueAt' | 'plannedAt' | 'remindAt', value: string | null) => void
}) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState<string | null>('2026-05-10')

	return (
		<DateControl
			field='dueAt'
			icon={<CalendarIcon />}
			label='截止时间'
			onDateChange={(field, nextValue) => {
				setValue(nextValue)
				onDateChange(field, nextValue)
			}}
			onOpenChange={setOpen}
			open={open}
			popoverKey='due'
			value={value}
		/>
	)
}

function PriorityControlHarness({
	disabled = false,
	onPriorityChange = () => undefined,
}: {
	disabled?: boolean
	onPriorityChange?: (priority: LauncherPriority) => void
}) {
	const [open, setOpen] = useState(false)

	return (
		<PriorityControl
			disabled={disabled}
			onOpenChange={setOpen}
			onPriorityChange={onPriorityChange}
			open={open}
			priority={0}
		/>
	)
}

function SpaceControlHarness({
	onSelectSpace = () => undefined,
}: {
	onSelectSpace?: (spaceId: string) => void
}) {
	const [open, setOpen] = useState(false)

	return (
		<SpaceControl
			iconOnly
			label='产品研发'
			onOpenChange={setOpen}
			onSelectSpace={onSelectSpace}
			open={open}
			selectedSpaceId='space-1'
			spaces={SPACES}
		/>
	)
}

function ControlsHarness({
	onPriorityChange,
	onSelectSpace,
}: {
	onPriorityChange: (priority: LauncherPriority) => void
	onSelectSpace: (spaceId: string) => void
}) {
	return (
		<>
			<PriorityControlHarness onPriorityChange={onPriorityChange} />
			<SpaceControlHarness onSelectSpace={onSelectSpace} />
		</>
	)
}

function renderControl(ui: React.ReactNode) {
	return render(ui)
}
