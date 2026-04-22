import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { searchWorkspace } from '@/features/global-search/api/searchWorkspace'
import { GlobalSearchInput } from '@/features/global-search/ui/GlobalSearchInput'

vi.mock('@/features/global-search/api/searchWorkspace', () => ({
	searchWorkspace: vi.fn<typeof searchWorkspace>(),
}))

const mockedSearchWorkspace = vi.mocked(searchWorkspace)

describe('GlobalSearchInput', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('支持 / 聚焦、分组展示并通过键盘打开高亮结果', async () => {
		const onOpenTask = vi.fn<(taskId: string) => void>()
		const onOpenProject = vi.fn<(projectId: string) => void>()

		mockedSearchWorkspace.mockResolvedValue({
			tasks: [
				{
					id: 'task-1',
					title: 'Alpha 任务',
					note: '命中标题',
					priority: 'high',
					projectId: 'project-1',
					projectName: '执行层',
					updatedAt: '2026-04-20T08:00:00Z',
				},
			],
			projects: [
				{
					id: 'project-1',
					name: 'Alpha 项目',
					note: '命中项目备注',
					status: 'active',
					sortOrder: 0,
				},
			],
		})

		render(
			<GlobalSearchInput
				currentSpaceId='default'
				onOpenProject={onOpenProject}
				onOpenTask={onOpenTask}
			/>,
		)

		fireEvent.keyDown(window, { key: '/' })

		const input = screen.getByLabelText('全局搜索')
		expect(input).toHaveFocus()

		fireEvent.change(input, { target: { value: 'alpha' } })

		await waitFor(() => {
			expect(mockedSearchWorkspace).toHaveBeenCalledWith({
				spaceSlug: 'default',
				query: 'alpha',
				limit: 5,
			})
		})

		expect(await screen.findByText('Tasks')).toBeInTheDocument()
		expect(screen.getByText('Projects')).toBeInTheDocument()
		expect(screen.getByText('Alpha 任务')).toBeInTheDocument()
		expect(screen.getByText('Alpha 项目')).toBeInTheDocument()

		fireEvent.keyDown(input, { key: 'ArrowDown' })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onOpenProject).toHaveBeenCalledWith('project-1')
		expect(onOpenTask).not.toHaveBeenCalled()
		expect(input).toHaveValue('')
	})

	it('点击 Task 结果时打开 Task Drawer，并允许 Esc 清空关闭', async () => {
		const onOpenTask = vi.fn<(taskId: string) => void>()
		const onOpenProject = vi.fn<(projectId: string) => void>()

		mockedSearchWorkspace.mockResolvedValue({
			tasks: [
				{
					id: 'task-2',
					title: '整理搜索面板',
					note: '补齐 Task 结果点击',
					priority: 'medium',
					projectId: null,
					projectName: null,
					updatedAt: '2026-04-20T09:00:00Z',
				},
			],
			projects: [],
		})

		render(
			<GlobalSearchInput
				currentSpaceId='default'
				onOpenProject={onOpenProject}
				onOpenTask={onOpenTask}
			/>,
		)

		const input = screen.getByLabelText('全局搜索')
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: '整理' } })

		const taskButton = await screen.findByRole('button', { name: /整理搜索面板/i })
		fireEvent.click(taskButton)

		expect(onOpenTask).toHaveBeenCalledWith('task-2')
		expect(onOpenProject).not.toHaveBeenCalled()

		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: '再次搜索' } })

		await waitFor(() => {
			expect(mockedSearchWorkspace).toHaveBeenCalledWith({
				spaceSlug: 'default',
				query: '再次搜索',
				limit: 5,
			})
		})

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(input).toHaveValue('')
		expect(screen.queryByText('Tasks')).not.toBeInTheDocument()
	})

	it('点击搜索框外部区域时收起结果面板', async () => {
		mockedSearchWorkspace.mockResolvedValue({
			tasks: [
				{
					id: 'task-3',
					title: '搜索框外部点击',
					note: '验证失焦行为',
					priority: 'low',
					projectId: null,
					projectName: null,
					updatedAt: '2026-04-20T10:00:00Z',
				},
			],
			projects: [],
		})

		render(
			<div>
				<GlobalSearchInput
					currentSpaceId='default'
					onOpenProject={vi.fn<(projectId: string) => void>()}
					onOpenTask={vi.fn<(taskId: string) => void>()}
				/>
				<button type='button'>外部区域</button>
			</div>,
		)

		const input = screen.getByLabelText('全局搜索')
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: '搜索框' } })

		expect(await screen.findByText('Tasks')).toBeInTheDocument()

		fireEvent.mouseDown(screen.getByRole('button', { name: '外部区域' }))

		await waitFor(() => {
			expect(screen.queryByText('Tasks')).not.toBeInTheDocument()
		})
	})

	it('输入框失焦时收起结果面板', async () => {
		mockedSearchWorkspace.mockResolvedValue({
			tasks: [
				{
					id: 'task-4',
					title: '失焦关闭',
					note: '验证 blur 兜底',
					priority: 'low',
					projectId: null,
					projectName: null,
					updatedAt: '2026-04-20T10:30:00Z',
				},
			],
			projects: [],
		})

		render(
			<GlobalSearchInput
				currentSpaceId='default'
				onOpenProject={vi.fn<(projectId: string) => void>()}
				onOpenTask={vi.fn<(taskId: string) => void>()}
			/>,
		)

		const input = screen.getByLabelText('全局搜索')
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: '失焦' } })

		expect(await screen.findByText('Tasks')).toBeInTheDocument()

		fireEvent.blur(input)

		await waitFor(() => {
			expect(screen.queryByText('Tasks')).not.toBeInTheDocument()
		})
	})

	it('任务刷新版本变化后用当前查询重新搜索', async () => {
		mockedSearchWorkspace
			.mockResolvedValueOnce({
				tasks: [],
				projects: [],
			})
			.mockResolvedValueOnce({
				tasks: [
					{
						id: 'task-capture',
						title: '系统捕获任务',
						note: '来自 Quick Capture',
						priority: null,
						projectId: null,
						projectName: null,
						updatedAt: '2026-04-22T08:00:00Z',
					},
				],
				projects: [],
			})

		render(
			<GlobalSearchInput
				currentSpaceId='default'
				onOpenProject={vi.fn<(projectId: string) => void>()}
				onOpenTask={vi.fn<(taskId: string) => void>()}
			/>,
		)

		const input = screen.getByLabelText('全局搜索')
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: '捕获' } })

		await waitFor(() => {
			expect(mockedSearchWorkspace).toHaveBeenCalledTimes(1)
		})

		useShellLayoutStore.getState().bumpTaskDataVersion()

		await waitFor(() => {
			expect(mockedSearchWorkspace).toHaveBeenCalledTimes(2)
		})
		expect(await screen.findByText('系统捕获任务')).toBeInTheDocument()
	})
})
