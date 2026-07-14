import { useLocation } from '@tanstack/react-router'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithMatchedRoute } from '@/test/renderWithRouter'
import { useEntityDetailController } from './useEntityDetailController'

const getTaskDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/task/api/tasks', () => ({
	getTaskDetail: (taskId: string) => getTaskDetailMock(taskId),
}))

describe('useEntityDetailController', () => {
	beforeEach(() => {
		getTaskDetailMock.mockReset()
	})

	it('从 URL 恢复 active detail', async () => {
		await renderController('/spaces/work/inbox?task=task-a')

		expect(screen.getByTestId('active-detail')).toHaveTextContent('task:task-a')
		expect(screen.getByTestId('is-open')).toHaveTextContent('open')
	})

	it('openDrawer 更新 URL', async () => {
		await renderController('/spaces/work/inbox')

		fireEvent.click(screen.getByRole('button', { name: '打开任务' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/work/inbox?task=task-a')
		})
	})

	it('closeDrawer 清理 URL 并保留其他 query', async () => {
		await renderController('/spaces/space-a/views/today?task=task-a')

		fireEvent.click(screen.getByRole('button', { name: '关闭详情' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/space-a/views/today')
		})
	})

	it('双 query 初始化后自动清理 project', async () => {
		await renderController('/spaces/space-a/views/today?task=task-a&project=project-a')

		await waitFor(() => {
			expect(screen.getByTestId('active-detail')).toHaveTextContent('task:task-a')
			expect(screen.getByTestId('location')).toHaveTextContent(
				'/spaces/space-a/views/today?task=task-a',
			)
		})
	})

	it('openPage 导航到独立详情页路径', async () => {
		getTaskDetailMock.mockResolvedValue({
			id: 'task-a',
			spaceId: 'space-work',
		})
		await renderController('/spaces/work/inbox?task=task-a')

		fireEvent.click(screen.getByRole('button', { name: '打开任务页面' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/space-work/tasks/task-a')
		})
	})

	it('openPage 解析失败时停留在当前页面', async () => {
		getTaskDetailMock.mockRejectedValue(new Error('not found'))
		await renderController('/spaces/work/inbox?task=task-a')

		fireEvent.click(screen.getByRole('button', { name: '打开任务页面' }))

		await waitFor(() => {
			expect(getTaskDetailMock).toHaveBeenCalledWith('task-a')
		})
		expect(screen.getByTestId('location')).toHaveTextContent('/spaces/work/inbox?task=task-a')
	})
})

function renderController(initialEntry: string) {
	return renderWithMatchedRoute(<ControllerProbe />, {
		initialEntry,
		path: '/$',
	})
}

function ControllerProbe() {
	const location = useLocation()
	const controller = useEntityDetailController()
	const activeDetail = controller.activeDetail
		? `${controller.activeDetail.kind}:${controller.activeDetail.id}`
		: 'none'

	return (
		<div>
			<div data-testid='active-detail'>{activeDetail}</div>
			<div data-testid='is-open'>{controller.isOpen ? 'open' : 'closed'}</div>
			<div data-testid='location'>
				{location.pathname}
				{location.searchStr}
			</div>
			<button onClick={() => controller.openDrawer({ kind: 'task', id: 'task-a' })} type='button'>
				打开任务
			</button>
			<button onClick={controller.closeDrawer} type='button'>
				关闭详情
			</button>
			<button onClick={() => controller.openPage({ kind: 'task', id: 'task-a' })} type='button'>
				打开任务页面
			</button>
		</div>
	)
}
