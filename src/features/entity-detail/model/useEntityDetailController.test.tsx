import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useEntityDetailController } from './useEntityDetailController'

describe('useEntityDetailController', () => {
	it('从 URL 恢复 active detail', () => {
		renderController('/space/work/inbox?task=task-a')

		expect(screen.getByTestId('active-detail')).toHaveTextContent('task:task-a')
		expect(screen.getByTestId('is-open')).toHaveTextContent('open')
	})

	it('openDrawer 更新 URL', async () => {
		renderController('/space/work/inbox')

		fireEvent.click(screen.getByRole('button', { name: '打开任务' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/space/work/inbox?task=task-a')
		})
	})

	it('closeDrawer 清理 URL 并保留其他 query', async () => {
		renderController('/spaces/views?view=today&task=task-a')

		fireEvent.click(screen.getByRole('button', { name: '关闭详情' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/views?view=today')
		})
	})

	it('双 query 初始化后自动清理 project', async () => {
		renderController('/spaces/views?view=today&task=task-a&project=project-a')

		await waitFor(() => {
			expect(screen.getByTestId('active-detail')).toHaveTextContent('task:task-a')
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/views?view=today&task=task-a')
		})
	})

	it('openPage 导航到独立详情页路径', async () => {
		renderController('/space/work/inbox?task=task-a')

		fireEvent.click(screen.getByRole('button', { name: '打开任务页面' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/tasks/task-a')
		})
	})
})

function renderController(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<ControllerProbe />} path='*' />
			</Routes>
		</MemoryRouter>,
	)
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
				{location.search}
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
