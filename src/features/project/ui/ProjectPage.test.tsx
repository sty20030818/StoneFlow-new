import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { getProjectExecutionView } from '@/features/project/api/getProjectExecutionView'
import { updateProjectTaskStatus } from '@/features/project/api/updateProjectTaskStatus'
import { ProjectPage } from '@/features/project/ui/ProjectPage'

vi.mock('@/features/project/api/getProjectExecutionView', () => ({
	getProjectExecutionView: vi.fn<typeof getProjectExecutionView>(),
}))

vi.mock('@/features/project/api/updateProjectTaskStatus', () => ({
	updateProjectTaskStatus: vi.fn<typeof updateProjectTaskStatus>(),
}))

const mockedGetProjectExecutionView = vi.mocked(getProjectExecutionView)
const mockedUpdateProjectTaskStatus = vi.mocked(updateProjectTaskStatus)

describe('ProjectPage', () => {
	afterEach(() => {
		vi.clearAllMocks()
		window.localStorage.clear()
		useShellLayoutStore.setState({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
			isProjectCreateOpen: false,
			projectCreateParentId: null,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
			projectDataVersion: 0,
			projectTaskBoardOpenSections: ['todo', 'done'],
		})
	})

	it('按新的状态分区结构加载 Project 执行视图', async () => {
		mockedGetProjectExecutionView.mockResolvedValue(buildProjectView())

		renderProjectPage()

		await waitFor(() => {
			expect(mockedGetProjectExecutionView).toHaveBeenCalledWith({
				spaceSlug: 'work',
				projectId: 'project-1',
			})
		})

		expect(await screen.findByText('接通 Project 查询')).toBeInTheDocument()
		expect(screen.getByText('完成状态切换')).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: /Todo/ })[0]).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: /Done/ })[0]).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '在 Todo 中创建任务' })).toBeInTheDocument()
		expect(screen.queryByText('待执行 1')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '更多项目操作' })).not.toBeInTheDocument()
		expect(screen.queryByText('子项目收口')).not.toBeInTheDocument()
	})

	it('点击分区头的加号时按分区写入创建默认值', async () => {
		mockedGetProjectExecutionView.mockResolvedValue(buildProjectView())

		renderProjectPage()

		await screen.findByText('接通 Project 查询')
		fireEvent.click(screen.getByRole('button', { name: '在 Done 中创建任务' }))

		expect(useShellLayoutStore.getState()).toMatchObject({
			isTaskCreateOpen: true,
			taskCreateProjectId: 'project-1',
			taskCreateStatus: 'done',
		})
	})

	it('切换任务状态成功后将任务移动到 Done 分区并回写反馈', async () => {
		mockedGetProjectExecutionView.mockResolvedValue({
			...buildProjectView(),
			tasks: [
				{
					id: 'task-1',
					title: '验证完成切换',
					note: '从待执行切到已完成',
					priority: 'urgent',
					status: 'todo',
					tags: [],
					dueAt: null,
					completedAt: null,
					createdAt: '2026-04-20T08:00:00Z',
					updatedAt: '2026-04-20T08:00:00Z',
				},
			],
		})
		mockedUpdateProjectTaskStatus.mockResolvedValue({
			taskId: 'task-1',
			status: 'done',
			completedAt: '2026-04-20T10:00:00Z',
			updatedAt: '2026-04-20T10:00:00Z',
		})

		renderProjectPage()

		await screen.findByText('验证完成切换')
		fireEvent.click(screen.getByRole('button', { name: '标记完成 验证完成切换' }))

		await waitFor(() => {
			expect(mockedUpdateProjectTaskStatus).toHaveBeenCalledWith({
				spaceSlug: 'work',
				projectId: 'project-1',
				taskId: 'task-1',
				status: 'done',
			})
		})

		expect(await screen.findByRole('status')).toHaveTextContent('已完成“验证完成切换”')
		expect(screen.getAllByRole('button', { name: /Done/ })[0]).toHaveTextContent('1')
		expect(screen.getByRole('button', { name: '恢复待执行 验证完成切换' })).toBeInTheDocument()
	})

	it('任务为空时展示两个状态分区的空态', async () => {
		mockedGetProjectExecutionView.mockResolvedValue({
			project: {
				id: 'project-1',
				name: '执行层',
				status: 'active',
				sortOrder: 0,
				parentProjectId: null,
				children: [],
			},
			childProjects: [],
			tasks: [],
		})

		renderProjectPage()

		expect(await screen.findByText('当前没有待执行任务。')).toBeInTheDocument()
		expect(screen.getByText('当前没有已完成任务。')).toBeInTheDocument()
	})

	it('点击任务行时打开 Task Drawer', async () => {
		mockedGetProjectExecutionView.mockResolvedValue(buildProjectView())

		renderProjectPage()

		fireEvent.click(await screen.findByRole('button', { name: '打开任务 接通 Project 查询' }))

		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-1',
		})
	})

	it('Accordion 展开状态在不同 Project 间全局共享', async () => {
		mockedGetProjectExecutionView
			.mockResolvedValueOnce(buildProjectView())
			.mockResolvedValueOnce({
				...buildProjectView(),
				project: {
					id: 'project-2',
					name: '第二项目',
					status: 'active',
					sortOrder: 0,
					parentProjectId: null,
					children: [],
				},
			})

		const firstRender = renderProjectPage('/space/work/project/project-1')
		const todoTrigger = (await screen.findAllByRole('button', { name: /Todo/ }))[0]
		await act(async () => {
			fireEvent.click(todoTrigger)
		})

		await waitFor(() => {
			expect(useShellLayoutStore.getState().projectTaskBoardOpenSections).toEqual(['done'])
		})

		firstRender.unmount()
		renderProjectPage('/space/personal/project/project-2')

		expect((await screen.findAllByRole('button', { name: /Todo/ }))[0]).toHaveAttribute(
			'data-state',
			'closed',
		)
	})

	it('任务刷新版本变化后重新拉取 Project 视图', async () => {
		mockedGetProjectExecutionView
			.mockResolvedValueOnce(buildProjectView())
			.mockResolvedValueOnce({
				...buildProjectView(),
				tasks: [],
			})

		renderProjectPage()

		expect(await screen.findByText('接通 Project 查询')).toBeInTheDocument()
		expect(mockedGetProjectExecutionView).toHaveBeenCalledTimes(1)

		await act(async () => {
			useShellLayoutStore.getState().bumpTaskDataVersion()
		})

		await waitFor(() => {
			expect(mockedGetProjectExecutionView).toHaveBeenCalledTimes(2)
		})
		await waitFor(() => {
			expect(screen.getByText('当前没有待执行任务。')).toBeInTheDocument()
		})
	})
})

function renderProjectPage(initialEntry = '/space/work/project/project-1') {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<ProjectPage />} path='/space/:spaceId/project/:projectId' />
			</Routes>
		</MemoryRouter>,
	)
}

function buildProjectView() {
	return {
		project: {
			id: 'project-1',
			name: '执行层',
			status: 'active',
			sortOrder: 0,
			parentProjectId: null,
			children: [],
		},
		childProjects: [
			{
				id: 'project-child',
				name: '子项目收口',
				status: 'active',
				sortOrder: 0,
				parentProjectId: 'project-1',
				children: [],
			},
		],
		tasks: [
			{
				id: 'task-1',
				title: '接通 Project 查询',
				note: '验证真实任务列表',
				priority: 'high',
				status: 'todo' as const,
				tags: [],
				dueAt: '2026-04-22T08:00:00Z',
				completedAt: null,
				createdAt: '2026-04-20T08:00:00Z',
				updatedAt: '2026-04-20T08:00:00Z',
			},
			{
				id: 'task-2',
				title: '完成状态切换',
				note: null,
				priority: 'medium',
				status: 'done' as const,
				tags: [],
				dueAt: null,
				completedAt: '2026-04-20T09:00:00Z',
				createdAt: '2026-04-20T09:00:00Z',
				updatedAt: '2026-04-20T09:00:00Z',
			},
		],
	}
}
