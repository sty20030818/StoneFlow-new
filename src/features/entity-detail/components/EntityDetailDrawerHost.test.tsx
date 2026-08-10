import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EntityDetailDrawerHost } from './EntityDetailDrawerHost'

vi.mock('@/features/task', () => ({
	TaskDrawer: ({ taskId, onClose }: { taskId: string; onClose: () => void }) => (
		<div data-testid='task-drawer'>
			<span>{taskId}</span>
			<button onClick={onClose} type='button'>
				关闭任务
			</button>
		</div>
	),
}))

describe('EntityDetailDrawerHost', () => {
	const onClose = vi.fn<() => void>()

	beforeEach(() => {
		onClose.mockReset()
	})

	it('task 分发到 task 渲染分支', () => {
		render(
			<EntityDetailDrawerHost
				activeDetail={{ kind: 'task', id: 'task-a' }}
				onClose={onClose}
				open
			/>,
		)

		expect(screen.getByTestId('task-drawer')).toHaveTextContent('task-a')
	})

	it('null 不渲染实体内容', () => {
		const { container } = render(
			<EntityDetailDrawerHost activeDetail={null} onClose={onClose} open />,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('close action 调用 onClose', () => {
		render(
			<EntityDetailDrawerHost
				activeDetail={{ kind: 'task', id: 'task-a' }}
				onClose={onClose}
				open
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '关闭任务' }))

		expect(onClose).toHaveBeenCalledTimes(1)
	})
})
