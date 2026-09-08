import { useState } from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'

import { CustomDateDialog } from '@/features/metadata-fields'
import { useDialogStore } from '@/features/shell-dialogs'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import { TaskCreateDateProperties } from './TaskCreateDateProperties'

const fields = [
	{ key: 'dueAt', label: '截止时间' },
	{ key: 'plannedAt', label: '计划时间' },
	{ key: 'remindAt', label: '提醒时间' },
] as const

describe('TaskCreateDateProperties', () => {
	beforeEach(() => useDialogStore.setState({ customDateDialog: null }))

	it('空日期仅显示更多入口，菜单保留三个设置入口', async () => {
		render(<DatePropertiesHarness />)
		expect(screen.getAllByRole('button')).toHaveLength(1)
		fireEvent.click(screen.getByRole('button', { name: '更多属性' }))
		for (const { label } of fields) {
			expect(await screen.findByRole('menuitem', { name: `设置${label}` })).toBeInTheDocument()
		}
	})

	it.each(fields)('$label 的两个入口修改同一值，清除后回到更多', async ({ label }) => {
		render(<DatePropertiesHarness />)
		fireEvent.click(screen.getByRole('button', { name: '更多属性' }))
		const setupTrigger = await screen.findByRole('menuitem', { name: `设置${label}` })
		act(() => setupTrigger.focus())
		fireEvent.keyDown(setupTrigger, { key: 'ArrowRight' })
		fireEvent.click(await screen.findByRole('menuitem', { name: /^明天/ }))
		expect(await screen.findByRole('button', { name: label })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '更多属性' }))
		const changeTrigger = await screen.findByRole('menuitem', { name: `更改${label}` })
		act(() => changeTrigger.focus())
		fireEvent.keyDown(changeTrigger, { key: 'ArrowRight' })
		fireEvent.click(await screen.findByRole('menuitem', { name: /^今天/ }))
		fireEvent.click(screen.getByRole('button', { name: label }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /移除当前日期/ }))

		await waitFor(() =>
			expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument(),
		)
		await waitFor(() => expect(screen.getByRole('button', { name: '更多属性' })).toHaveFocus())
		fireEvent.click(screen.getByRole('button', { name: '更多属性' }))
		expect(await screen.findByRole('menuitem', { name: `设置${label}` })).toBeInTheDocument()
	})

	it('自定义日期取消后保留值并返回仍存在的胶囊', async () => {
		render(<DatePropertiesHarness initialDates={{ dueAt: '2026-05-10' }} />)
		const pill = screen.getByRole('button', { name: '截止时间' })
		act(() => pill.focus())
		fireEvent.click(pill)
		fireEvent.click(await screen.findByRole('menuitem', { name: /自定义日期/ }))
		expect(await screen.findByRole('dialog')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '取消' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(pill).toHaveTextContent('5/10')
		await waitFor(() => expect(pill).toHaveFocus())
	})

	it('Escape 依次退出日期子菜单和更多菜单', async () => {
		render(<DatePropertiesHarness />)
		const moreButton = screen.getByRole('button', { name: '更多属性' })
		act(() => moreButton.focus())
		fireEvent.keyDown(moreButton, { key: 'Enter' })
		fireEvent.keyUp(moreButton, { key: 'Enter' })
		const setupTrigger = await screen.findByRole('menuitem', { name: '设置截止时间' })
		act(() => setupTrigger.focus())
		fireEvent.keyDown(setupTrigger, { key: 'ArrowRight' })
		fireEvent.keyDown(await screen.findByRole('menuitem', { name: /^今天/ }), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('menuitem', { name: /^今天/ })).not.toBeInTheDocument(),
		)
		expect(setupTrigger).toBeInTheDocument()
		await waitFor(() => expect(setupTrigger).toHaveFocus())
		fireEvent.keyDown(setupTrigger, { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
		await waitFor(() => expect(moreButton).toHaveFocus())
	})

	it('从更多打开自定义日期后取消，焦点返回更多且不设置值', async () => {
		render(<DatePropertiesHarness />)
		const moreButton = screen.getByRole('button', { name: '更多属性' })
		act(() => moreButton.focus())
		fireEvent.click(moreButton)
		const setupTrigger = await screen.findByRole('menuitem', { name: '设置截止时间' })
		act(() => setupTrigger.focus())
		fireEvent.keyDown(setupTrigger, { key: 'ArrowRight' })
		fireEvent.click(await screen.findByRole('menuitem', { name: /自定义日期/ }))
		fireEvent.click(await screen.findByRole('button', { name: '取消' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		await waitFor(() => expect(moreButton).toHaveFocus())
		expect(screen.queryByRole('button', { name: '截止时间' })).not.toBeInTheDocument()
	})

	it('从自定义日期清除胶囊，焦点返回更多', async () => {
		render(<DatePropertiesHarness initialDates={{ dueAt: '2026-05-10' }} />)
		const pill = screen.getByRole('button', { name: '截止时间' })
		act(() => pill.focus())
		fireEvent.click(pill)
		fireEvent.click(await screen.findByRole('menuitem', { name: /自定义日期/ }))
		fireEvent.click(await screen.findByRole('button', { name: '移除截止时间' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		await waitFor(() => expect(screen.getByRole('button', { name: '更多属性' })).toHaveFocus())
		expect(screen.queryByRole('button', { name: '截止时间' })).not.toBeInTheDocument()
	})

	it('三个胶囊按截止、计划、提醒排序，更多始终最后', () => {
		render(
			<DatePropertiesHarness
				initialDates={{ remindAt: '2026-05-12', dueAt: '2026-05-10', plannedAt: '2026-05-11' }}
			/>,
		)
		expect(
			screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
		).toEqual(['截止时间', '计划时间', '提醒时间', '更多属性'])
	})
})

function DatePropertiesHarness({
	initialDates,
}: {
	initialDates?: Partial<Record<(typeof fields)[number]['key'], string>>
}) {
	const [dueAt, setDueAt] = useState<string | null>(initialDates?.dueAt ?? null)
	const [plannedAt, setPlannedAt] = useState<string | null>(initialDates?.plannedAt ?? null)
	const [remindAt, setRemindAt] = useState<string | null>(initialDates?.remindAt ?? null)
	const customDateDialog = useDialogStore((state) => state.customDateDialog)
	const closeCustomDateDialog = useDialogStore((state) => state.closeCustomDateDialog)

	return (
		<>
			<TaskCreateDateProperties
				dueAt={dueAt}
				plannedAt={plannedAt}
				remindAt={remindAt}
				onDueAtChange={setDueAt}
				onPlannedAtChange={setPlannedAt}
				onRemindAtChange={setRemindAt}
			/>
			{customDateDialog ? (
				<CustomDateDialog
					{...customDateDialog}
					open
					onOpenChange={(open) => {
						if (!open) closeCustomDateDialog()
					}}
					onSubmit={(value) => {
						customDateDialog.onSubmit?.(value)
						closeCustomDateDialog()
					}}
				/>
			) : null}
		</>
	)
}
