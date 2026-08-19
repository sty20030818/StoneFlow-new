import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import type { LauncherPriority, LauncherSpaceSummary } from '../../model/types'

import { PriorityControl } from './PriorityControl'
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
})

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
