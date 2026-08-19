import { act, fireEvent, render, screen } from '@testing-library/react'

import { BASE_TASK_DISPLAY_OPTIONS } from '@/features/display-options/core'

import { DisplayOptionsPanel } from './DisplayOptionsPanel'

const actions = {
	setGrouping: vi.fn(async () => undefined),
	setSubGrouping: vi.fn(async () => undefined),
	setOrdering: vi.fn(async () => undefined),
	setCompletedOrder: vi.fn(async () => undefined),
	applyPartial: vi.fn(async () => undefined),
	setVisibleProperties: vi.fn(async () => undefined),
	setAsDefault: vi.fn(async () => undefined),
	resetToDefault: vi.fn(async () => undefined),
}

describe('DisplayOptionsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('排序方向按钮显示动作提示并执行方向切换', async () => {
		render(
			<DisplayOptionsPanel
				actions={actions}
				options={{ ...BASE_TASK_DISPLAY_OPTIONS, orderDirection: 'asc' }}
				pageKey='task:all'
				status='ready'
			/>,
		)

		const trigger = screen.getByRole('button', { name: '切换为降序' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('切换为降序')

		fireEvent.click(trigger)
		expect(actions.setOrdering).toHaveBeenCalledWith('smart', 'desc')
	})

	it('读取偏好期间说明排序方向不可用的原因', async () => {
		render(
			<DisplayOptionsPanel
				actions={actions}
				options={{ ...BASE_TASK_DISPLAY_OPTIONS, orderDirection: 'asc' }}
				pageKey='task:all'
				status='loading'
			/>,
		)

		const trigger = screen.getByRole('group', { name: '切换为降序' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('切换为降序正在读取显示偏好')
	})

	it('开关与属性变更会即时写入显示偏好', () => {
		render(
			<DisplayOptionsPanel
				actions={actions}
				options={{ ...BASE_TASK_DISPLAY_OPTIONS, showEmptyGroups: false }}
				pageKey='task:all'
				status='ready'
			/>,
		)

		fireEvent.click(screen.getByRole('switch', { name: '显示空分组' }))
		expect(actions.applyPartial).toHaveBeenCalledWith({ showEmptyGroups: true })

		fireEvent.click(screen.getByRole('button', { name: '更新时间' }))
		expect(actions.setVisibleProperties).toHaveBeenCalledWith([
			'status',
			'priority',
			'project',
			'dueAt',
			'updatedAt',
		])
	})

	it('分组选择会即时执行受能力约束的变更', async () => {
		render(
			<DisplayOptionsPanel
				actions={actions}
				options={BASE_TASK_DISPLAY_OPTIONS}
				pageKey='task:all'
				status='ready'
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '状态 分组' }))
		fireEvent.click(await screen.findByRole('option', { name: '优先级' }))

		expect(actions.setGrouping).toHaveBeenCalledWith('priority')
	})
})
