import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EntityDetailDrawerHost } from './EntityDetailDrawerHost'

vi.mock('@/features/task/detail', () => ({
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
				currentSpaceLabel='Work'
				onClose={onClose}
				open
			/>,
		)

		expect(screen.getByTestId('task-drawer')).toHaveTextContent('task-a')
	})

	it('project 分发到 project 渲染分支', () => {
		render(
			<EntityDetailDrawerHost
				activeDetail={{ kind: 'project', id: 'project-a' }}
				currentSpaceLabel='Work'
				onClose={onClose}
				open
			/>,
		)

		expect(screen.getByText('项目详情')).toBeInTheDocument()
		expect(screen.getByText('project-a')).toBeInTheDocument()
	})

	it('null 不渲染实体内容', () => {
		const { container } = render(
			<EntityDetailDrawerHost
				activeDetail={null}
				currentSpaceLabel='Work'
				onClose={onClose}
				open
			/>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('close action 调用 onClose', () => {
		render(
			<EntityDetailDrawerHost
				activeDetail={{ kind: 'project', id: 'project-a' }}
				currentSpaceLabel='Work'
				onClose={onClose}
				open
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '关闭' }))

		expect(onClose).toHaveBeenCalledTimes(1)
	})
})
