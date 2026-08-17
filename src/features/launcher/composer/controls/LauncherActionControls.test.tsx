import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { LauncherSpaceSummary } from '../../model/types'

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
	it('优先级只显示动作名，菜单打开后关闭 Tooltip', async () => {
		renderControl(<PriorityControlHarness />)

		const trigger = screen.getByRole('button', { name: '优先级' })
		fireEvent.keyDown(document, { key: 'Tab' })
		trigger.focus()
		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('设置优先级')
		expect(tooltip.querySelector('[data-slot="kbd"]')).toBeNull()

		fireEvent.pointerDown(trigger)
		expect(await screen.findByRole('menu')).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('创建中通过可聚焦外壳解释优先级禁用原因', async () => {
		renderControl(<PriorityControlHarness disabled />)

		const disabledTrigger = screen.getByRole('group', { name: '设置优先级' })
		fireEvent.keyDown(document, { key: 'Tab' })
		disabledTrigger.focus()

		expect(await screen.findByRole('tooltip')).toHaveTextContent('正在创建，暂时无法修改优先级')
		expect(screen.getByRole('button', { name: '优先级' })).toBeDisabled()
	})

	it('Space 只显示动作名，菜单打开后关闭 Tooltip', async () => {
		renderControl(<SpaceControlHarness />)

		const trigger = screen.getByRole('button', { name: '空间选择' })
		fireEvent.keyDown(document, { key: 'Tab' })
		trigger.focus()
		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('选择空间')
		expect(tooltip.querySelector('[data-slot="kbd"]')).toBeNull()

		fireEvent.pointerDown(trigger)
		expect(await screen.findByRole('menu')).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})

function PriorityControlHarness({ disabled = false }: { disabled?: boolean }) {
	const [open, setOpen] = useState(false)

	return (
		<PriorityControl
			disabled={disabled}
			onOpenChange={setOpen}
			onPriorityChange={() => undefined}
			open={open}
			priority={0}
		/>
	)
}

function SpaceControlHarness() {
	const [open, setOpen] = useState(false)

	return (
		<SpaceControl
			iconOnly
			label='产品研发'
			onOpenChange={setOpen}
			onSelectSpace={() => undefined}
			open={open}
			selectedSpaceId='space-1'
			spaces={SPACES}
		/>
	)
}

function renderControl(ui: React.ReactNode) {
	return render(ui)
}
