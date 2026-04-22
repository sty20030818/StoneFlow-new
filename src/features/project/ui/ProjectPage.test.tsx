import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
		useShellLayoutStore.setState({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			projectCreateParentId: null,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('加载真实 Project 执行视图', async () => {
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
			tasks: [
				{
					id: 'task-1',
					title: '接通 Project 查询',
					note: '验证真实任务列表',
					priority: 'high',
					status: 'todo',
					completedAt: null,
					updatedAt: '2026-04-20T08:00:00Z',
				},
				{
					id: 'task-2',
					title: '完成状态切换',
					note: null,
					priority: 'medium',
					status: 'done',
					completedAt: '2026-04-20T09:00:00Z',
					updatedAt: '2026-04-20T09:00:00Z',
				},
			],
		})

		renderProjectPage()

		await waitFor(() => {
			expect(mockedGetProjectExecutionView).toHaveBeenCalledWith({
				spaceSlug: 'default',
				projectId: 'project-1',
			})
		})

		expect(await screen.findByText('接通 Project 查询')).toBeInTheDocument()
		expect(screen.getByText('完成状态切换')).toBeInTheDocument()
		expect(screen.getByText('项目工作区 · 执行层')).toBeInTheDocument()
		expect(screen.getByText('active')).toHaveAttribute('data-variant', 'primary')
		expect(screen.getByText('已完成 1')).toHaveAttribute('data-variant', 'success')
		expect(
			within(
				screen.getByText('完成状态切换').closest('[data-shell-task-card="true"]') as HTMLElement,
			).getByText('已完成'),
		).toHaveAttribute('data-variant', 'success')
	})

	it('切换任务状态成功后回写反馈', async () => {
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
			tasks: [
				{
					id: 'task-1',
					title: '验证完成切换',
					note: '从待执行切到已完成',
					priority: 'urgent',
					status: 'todo',
					completedAt: null,
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
		fireEvent.click(screen.getByRole('button', { name: '标记完成' }))

		await waitFor(() => {
			expect(mockedUpdateProjectTaskStatus).toHaveBeenCalledWith({
				spaceSlug: 'default',
				projectId: 'project-1',
				taskId: 'task-1',
				status: 'done',
			})
		})

		expect(await screen.findByRole('status')).toHaveTextContent('已完成“验证完成切换”')
		expect(screen.getByRole('button', { name: '恢复待执行' })).toBeInTheDocument()
	})

	it('切换任务状态失败后展示错误提示并保留任务', async () => {
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
			tasks: [
				{
					id: 'task-1',
					title: '验证错误反馈',
					note: null,
					priority: 'high',
					status: 'todo',
					completedAt: null,
					updatedAt: '2026-04-20T08:00:00Z',
				},
			],
		})
		mockedUpdateProjectTaskStatus.mockRejectedValue(
			new Error('project task status update rejected'),
		)

		renderProjectPage()

		await screen.findByText('验证错误反馈')
		fireEvent.click(screen.getByRole('button', { name: '标记完成' }))

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('project task status update rejected')
		})

		expect(screen.getByText('验证错误反馈')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '标记完成' })).toBeInTheDocument()
	})

	it('任务为空时展示空态', async () => {
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

		expect(await screen.findByText('当前 Project 还没有待执行任务。')).toBeInTheDocument()
		expect(screen.getByText('还没有完成的任务。')).toBeInTheDocument()
	})

	it('展示直属子项目入口并允许进入子项目', async () => {
		mockedGetProjectExecutionView.mockResolvedValue({
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
			tasks: [],
		})

		renderProjectPage()

		fireEvent.click(await screen.findByRole('button', { name: /子项目收口/ }))

		await waitFor(() => {
			expect(mockedGetProjectExecutionView).toHaveBeenCalledWith({
				spaceSlug: 'default',
				projectId: 'project-child',
			})
		})
	})

	it('点击创建子项目时打开 Project 创建弹窗并记录父项目', async () => {
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

		fireEvent.click(await screen.findByRole('button', { name: '子项目' }))

		expect(useShellLayoutStore.getState()).toMatchObject({
			isProjectCreateOpen: true,
			projectCreateParentId: 'project-1',
		})
	})

	it('点击任务标题时打开 Task Drawer', async () => {
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
			tasks: [
				{
					id: 'task-1',
					title: '打开 Project Drawer',
					note: '验证入口',
					priority: 'high',
					status: 'todo',
					completedAt: null,
					updatedAt: '2026-04-20T08:00:00Z',
				},
			],
		})

		renderProjectPage()

		fireEvent.click(await screen.findByRole('button', { name: '打开任务 打开 Project Drawer' }))

		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-1',
		})
	})

	it('任务刷新版本变化后重新拉取 Project 列表', async () => {
		mockedGetProjectExecutionView
			.mockResolvedValueOnce({
				project: {
					id: 'project-1',
					name: '执行层',
					status: 'active',
					sortOrder: 0,
					parentProjectId: null,
					children: [],
				},
				childProjects: [],
				tasks: [
					{
						id: 'task-1',
						title: '第一次 Project 拉取',
						note: null,
						priority: 'high',
						status: 'todo',
						completedAt: null,
						updatedAt: '2026-04-20T08:00:00Z',
					},
				],
			})
			.mockResolvedValueOnce({
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

		expect(await screen.findByText('第一次 Project 拉取')).toBeInTheDocument()
		expect(mockedGetProjectExecutionView).toHaveBeenCalledTimes(1)

		useShellLayoutStore.getState().bumpTaskDataVersion()

		await waitFor(() => {
			expect(mockedGetProjectExecutionView).toHaveBeenCalledTimes(2)
		})
		expect(await screen.findByText('当前 Project 还没有待执行任务。')).toBeInTheDocument()
	})
})

function renderProjectPage() {
	return render(
		<MemoryRouter initialEntries={['/space/default/project/project-1']}>
			<Routes>
				<Route element={<ProjectPage />} path='/space/:spaceId/project/:projectId' />
			</Routes>
		</MemoryRouter>,
	)
}
