import { fireEvent, render, screen } from '@testing-library/react'

import { BASE_TASK_DISPLAY_OPTIONS } from '@/features/display-options/core'
import { TooltipProvider } from '@/shared/components/base/tooltip'

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
			<TooltipProvider delayDuration={0}>
				<DisplayOptionsPanel
					actions={actions}
					options={{ ...BASE_TASK_DISPLAY_OPTIONS, orderDirection: 'asc' }}
					pageKey='task:all'
					status='ready'
				/>
			</TooltipProvider>,
		)

		const trigger = screen.getByRole('button', { name: '切换为降序' })
		fireEvent.focus(trigger)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('切换为降序')

		fireEvent.click(trigger)
		expect(actions.setOrdering).toHaveBeenCalledWith('smart', 'desc')
	})

	it('读取偏好期间说明排序方向不可用的原因', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<DisplayOptionsPanel
					actions={actions}
					options={{ ...BASE_TASK_DISPLAY_OPTIONS, orderDirection: 'asc' }}
					pageKey='task:all'
					status='loading'
				/>
			</TooltipProvider>,
		)

		const trigger = screen.getByRole('group', { name: '切换为降序' })
		fireEvent.focus(trigger)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('切换为降序正在读取显示偏好')
	})
})
