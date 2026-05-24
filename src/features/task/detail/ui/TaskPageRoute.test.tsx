import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TaskPageRoute } from './TaskPageRoute'

const getTaskDetailMock = vi.hoisted(() => vi.fn())
const taskPagePropsSpy = vi.hoisted(() => vi.fn())

const spaceState = vi.hoisted(() => ({
	spaces: [{ id: 'space-1', name: '工作' }],
}))

vi.mock('@/features/task/api/tasks', () => ({
	getTaskDetail: (taskId: string) => getTaskDetailMock(taskId),
}))

vi.mock('@/features/space/model/useSpaceStore', () => ({
	selectSpaces: (state: typeof spaceState) => state.spaces,
	useSpaceStore: (selector: (state: typeof spaceState) => unknown) => selector(spaceState),
}))

vi.mock('./TaskPage', () => ({
	TaskPage: (props: unknown) => {
		taskPagePropsSpy(props)
		return <div>Task page body</div>
	},
}))

describe('TaskPageRoute', () => {
	beforeEach(() => {
		getTaskDetailMock.mockReset()
		taskPagePropsSpy.mockClear()
		spaceState.spaces = [{ id: 'space-1', name: '工作' }]
	})

	it('canonical 任务详情路由能打开任务页面', async () => {
		mockTaskDetail()

		renderTaskPageRoute('/spaces/space-1/tasks/task-1')

		expect(await screen.findByText('Task page body')).toBeInTheDocument()
		expect(taskPagePropsSpy).toHaveBeenCalledWith({
			taskId: 'task-1',
			scope: { type: 'space', spaceId: 'space-1' },
		})
		expect(screen.getByTestId('location')).toHaveTextContent('/spaces/space-1/tasks/task-1')
	})

	it('shortcut 任务路由 replace 到 canonical 详情路由', async () => {
		mockTaskDetail()

		renderTaskPageRoute('/tasks/task-1')

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/space-1/tasks/task-1')
		})
		expect(await screen.findByText('Task page body')).toBeInTheDocument()
	})

	it('canonical spaceId 不匹配时 replace 到实体真实空间', async () => {
		mockTaskDetail()

		renderTaskPageRoute('/spaces/wrong-space/tasks/task-1')

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/space-1/tasks/task-1')
		})
	})

	it('未知任务进入错误态', async () => {
		getTaskDetailMock.mockRejectedValue(new Error('not found'))

		renderTaskPageRoute('/spaces/space-1/tasks/missing-task')

		expect(await screen.findByText('任务不可用')).toBeInTheDocument()
		expect(screen.getByText('not found')).toBeInTheDocument()
	})

	it('不可见任务进入错误态', async () => {
		spaceState.spaces = [{ id: 'space-2', name: '生活' }]
		mockTaskDetail()

		renderTaskPageRoute('/spaces/space-1/tasks/task-1')

		expect(await screen.findByText('任务不可用')).toBeInTheDocument()
		expect(screen.getByText('当前任务所属 Space 不可见，可能已被归档、删除，或当前账号无权访问。')).toBeInTheDocument()
	})
})

function mockTaskDetail() {
	getTaskDetailMock.mockResolvedValue({
		id: 'task-1',
		spaceId: 'space-1',
		projectId: null,
		title: '任务 A',
		description: null,
		notes: null,
		status: 'todo',
		priority: 'none',
		dueAt: null,
		scheduledAt: null,
		completedAt: null,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-24T00:00:00Z',
		updatedAt: '2026-05-24T00:00:00Z',
	})
}

function renderTaskPageRoute(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<RouteProbe />} path='*' />
			</Routes>
		</MemoryRouter>,
	)
}

function RouteProbe() {
	const location = useLocation()

	return (
		<>
			<div data-testid='location'>
				{location.pathname}
				{location.search}
			</div>
			<Routes>
				<Route element={<TaskPageRoute />} path='/tasks/:taskId' />
				<Route element={<TaskPageRoute />} path='/spaces/:spaceId/tasks/:taskId' />
			</Routes>
		</>
	)
}
