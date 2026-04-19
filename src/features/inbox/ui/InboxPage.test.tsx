import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { listInboxTasks } from '@/features/inbox/api/listInboxTasks'
import { triageInboxTask } from '@/features/inbox/api/triageInboxTask'
import { InboxPage } from '@/features/inbox/ui/InboxPage'

vi.mock('@/features/inbox/api/listInboxTasks', () => ({
	listInboxTasks: vi.fn<typeof listInboxTasks>(),
}))

vi.mock('@/features/inbox/api/triageInboxTask', () => ({
	triageInboxTask: vi.fn<typeof triageInboxTask>(),
}))

const mockedListInboxTasks = vi.mocked(listInboxTasks)
const mockedTriageInboxTask = vi.mocked(triageInboxTask)

describe('InboxPage', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			currentSpaceId: 'default',
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
		})
	})

	it('加载真实 Inbox 列表', async () => {
		mockedListInboxTasks.mockResolvedValue({
			tasks: [
				{
					id: 'task-1',
					projectId: null,
					title: '整理今天的新任务',
					note: '优先补齐项目和优先级',
					status: 'todo',
					priority: null,
					createdAt: '2026-04-19T20:00:00Z',
					updatedAt: '2026-04-19T20:00:00Z',
				},
			],
			projects: [
				{
					id: 'project-1',
					name: 'M2-C',
					sortOrder: 0,
				},
			],
		})

		render(<InboxPage />)

		await waitFor(() => {
			expect(mockedListInboxTasks).toHaveBeenCalledWith({ spaceSlug: 'default' })
		})

		await screen.findByText('整理今天的新任务')

		expect(screen.getByText('整理今天的新任务')).toBeInTheDocument()
		expect(screen.getByText('优先补齐项目和优先级')).toBeInTheDocument()
		expect(screen.getByLabelText('整理今天的新任务 优先级')).toHaveValue('')
		expect(screen.getByLabelText('整理今天的新任务 项目')).toHaveValue('')
	})

	it('整理成功后移除已完成归类的任务', async () => {
		mockedListInboxTasks.mockResolvedValue({
			tasks: [
				{
					id: 'task-1',
					projectId: null,
					title: '整理今天的任务',
					note: '补齐后应离开 Inbox',
					status: 'todo',
					priority: null,
					createdAt: '2026-04-19T20:00:00Z',
					updatedAt: '2026-04-19T20:00:00Z',
				},
			],
			projects: [
				{
					id: 'project-1',
					name: '执行层',
					sortOrder: 0,
				},
			],
		})
		mockedTriageInboxTask.mockResolvedValue({
			taskId: 'task-1',
			projectId: 'project-1',
			priority: 'high',
			status: 'todo',
			remainsInInbox: false,
			updatedAt: '2026-04-19T20:10:00Z',
		})

		render(<InboxPage />)

		await screen.findByText('整理今天的任务')

		fireEvent.change(screen.getByLabelText('整理今天的任务 优先级'), {
			target: { value: 'high' },
		})
		fireEvent.change(screen.getByLabelText('整理今天的任务 项目'), {
			target: { value: 'project-1' },
		})
		fireEvent.click(screen.getByRole('button', { name: '整理' }))

		await waitFor(() => {
			expect(mockedTriageInboxTask).toHaveBeenCalledWith({
				spaceSlug: 'default',
				taskId: 'task-1',
				projectId: 'project-1',
				priority: 'high',
			})
		})

		await waitFor(() => {
			expect(screen.queryByText('整理今天的任务')).not.toBeInTheDocument()
		})

		expect(screen.getByText('已整理“整理今天的任务”，任务已离开 Inbox')).toBeInTheDocument()
	})

	it('整理失败后展示错误提示并保留任务', async () => {
		mockedListInboxTasks.mockResolvedValue({
			tasks: [
				{
					id: 'task-1',
					projectId: null,
					title: '验证整理失败',
					note: null,
					status: 'todo',
					priority: null,
					createdAt: '2026-04-19T20:00:00Z',
					updatedAt: '2026-04-19T20:00:00Z',
				},
			],
			projects: [],
		})
		mockedTriageInboxTask.mockRejectedValue(
			new Error('task priority must be one of `low`, `medium`, `high`, `urgent`'),
		)

		render(<InboxPage />)

		await screen.findByText('验证整理失败')

		fireEvent.change(screen.getByLabelText('验证整理失败 优先级'), {
			target: { value: 'urgent' },
		})
		fireEvent.click(screen.getByRole('button', { name: '整理' }))

		await waitFor(() => {
			expect(screen.getByRole('alert').textContent).toContain(
				'task priority must be one of `low`, `medium`, `high`, `urgent`',
			)
		})

		expect(screen.getByText('验证整理失败')).toBeInTheDocument()
	})

	it('点击任务标题时打开 Task Drawer', async () => {
		mockedListInboxTasks.mockResolvedValue({
			tasks: [
				{
					id: 'task-1',
					projectId: null,
					title: '打开 Drawer',
					note: '验证入口',
					status: 'todo',
					priority: null,
					createdAt: '2026-04-19T20:00:00Z',
					updatedAt: '2026-04-19T20:00:00Z',
				},
			],
			projects: [],
		})

		render(<InboxPage />)

		fireEvent.click(await screen.findByRole('button', { name: '打开 Drawer' }))

		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-1',
		})
	})

	it('任务刷新版本变化后重新拉取 Inbox 列表', async () => {
		mockedListInboxTasks
			.mockResolvedValueOnce({
				tasks: [
					{
						id: 'task-1',
						projectId: null,
						title: '第一次拉取',
						note: null,
						status: 'todo',
						priority: null,
						createdAt: '2026-04-19T20:00:00Z',
						updatedAt: '2026-04-19T20:00:00Z',
					},
				],
				projects: [],
			})
			.mockResolvedValueOnce({
				tasks: [],
				projects: [],
			})

		render(<InboxPage />)

		expect(await screen.findByText('第一次拉取')).toBeInTheDocument()
		expect(mockedListInboxTasks).toHaveBeenCalledTimes(1)

		useShellLayoutStore.getState().bumpTaskDataVersion()

		await waitFor(() => {
			expect(mockedListInboxTasks).toHaveBeenCalledTimes(2)
		})
		expect(await screen.findByText('当前 Inbox 已清空')).toBeInTheDocument()
	})
})
