import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { getFocusViewTasks } from '@/features/focus/api/getFocusViewTasks'
import { listFocusViews } from '@/features/focus/api/listFocusViews'
import { updateTaskPinState } from '@/features/focus/api/updateTaskPinState'
import { updateProjectTaskStatus } from '@/features/project/api/updateProjectTaskStatus'
import { useFocusWorkspace } from '@/features/focus/model/useFocusWorkspace'

vi.mock('@/features/focus/api/listFocusViews', () => ({
	listFocusViews: vi.fn<typeof listFocusViews>(),
}))

vi.mock('@/features/focus/api/getFocusViewTasks', () => ({
	getFocusViewTasks: vi.fn<typeof getFocusViewTasks>(),
}))

vi.mock('@/features/focus/api/updateTaskPinState', () => ({
	updateTaskPinState: vi.fn<typeof updateTaskPinState>(),
}))

vi.mock('@/features/project/api/updateProjectTaskStatus', () => ({
	updateProjectTaskStatus: vi.fn<typeof updateProjectTaskStatus>(),
}))

const mockedListFocusViews = vi.mocked(listFocusViews)
const mockedGetFocusViewTasks = vi.mocked(getFocusViewTasks)
const mockedUpdateTaskPinState = vi.mocked(updateTaskPinState)
const mockedUpdateProjectTaskStatus = vi.mocked(updateProjectTaskStatus)

describe('useFocusWorkspace', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			currentSpaceId: 'work',
			activeSection: 'inbox',
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('加载所有 Focus 视图、缓存真实任务并生成摘要', async () => {
		const snapshots = createSnapshots()
		mockedListFocusViews.mockResolvedValue(createViews())
		mockedGetFocusViewTasks.mockImplementation(async ({ viewKey }) => snapshots[viewKey])

		render(<FocusWorkspaceHarness />)

		await waitFor(() => {
			expect(mockedListFocusViews).toHaveBeenCalledWith({ spaceSlug: 'work' })
		})
		await waitFor(() => {
			expect(mockedGetFocusViewTasks).toHaveBeenCalledTimes(4)
		})

		expect(await screen.findByText('Focus')).toBeInTheDocument()
		expect(screen.getByText('收口 Focus 查询')).toBeInTheDocument()
		expect(screen.getByText('Focus:1')).toBeInTheDocument()
		expect(screen.getByText('Upcoming:1')).toBeInTheDocument()
		expect(screen.getByText('最近添加:2')).toBeInTheDocument()
		expect(screen.getByText('高优先级:1')).toBeInTheDocument()
	})

	it('切换 tabs 和最近添加时间窗时更新当前展示结果', async () => {
		const snapshots = createSnapshots()
		mockedListFocusViews.mockResolvedValue(createViews())
		mockedGetFocusViewTasks.mockImplementation(async ({ viewKey }) => snapshots[viewKey])

		render(<FocusWorkspaceHarness />)

		await screen.findByText('收口 Focus 查询')
		fireEvent.click(screen.getByRole('button', { name: '切换到 recent' }))

		expect(await screen.findByText('最近一周新增')).toBeInTheDocument()
		expect(screen.getByText('很早之前的任务')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '时间窗 7d' }))

		expect(await screen.findByText('最近一周新增')).toBeInTheDocument()
		expect(screen.queryByText('很早之前的任务')).not.toBeInTheDocument()
	})

	it('pin 状态切换成功后刷新真实任务并展示反馈', async () => {
		const snapshots = createSnapshots()
		mockedListFocusViews.mockResolvedValue(createViews())
		mockedGetFocusViewTasks.mockImplementation(async ({ viewKey }) => snapshots[viewKey])
		mockedUpdateTaskPinState.mockResolvedValue({
			taskId: 'task-upcoming-1',
			pinned: true,
			updatedAt: '2026-04-20T10:00:00Z',
		})
		mockedUpdateTaskPinState.mockImplementation(async () => {
			snapshots.upcoming = {
				...snapshots.upcoming,
				tasks: snapshots.upcoming.tasks.map((task) =>
					task.id === 'task-upcoming-1'
						? {
								...task,
								pinned: true,
								updatedAt: '2026-04-20T10:00:00Z',
							}
						: task,
				),
			}
			snapshots.focus = {
				...snapshots.focus,
				tasks: [...snapshots.focus.tasks, snapshots.upcoming.tasks[0] ?? createTask()],
			}

			return {
				taskId: 'task-upcoming-1',
				pinned: true,
				updatedAt: '2026-04-20T10:00:00Z',
			}
		})

		render(<FocusWorkspaceHarness />)

		fireEvent.click(await screen.findByRole('button', { name: '切换到 upcoming' }))
		await screen.findByText('补齐 pin 动作')
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '切换 pin 补齐 pin 动作' }))
		})

		await waitFor(() => {
			expect(mockedUpdateTaskPinState).toHaveBeenCalledWith({
				spaceSlug: 'work',
				taskId: 'task-upcoming-1',
				pinned: true,
			})
		})

		expect(await screen.findByRole('status')).toHaveTextContent('已将“补齐 pin 动作”加入 Focus')
		expect(screen.getByText('补齐 pin 动作:已 Pin')).toBeInTheDocument()
	})

	it('任务状态切换成功后刷新结果并移出 Focus 列表', async () => {
		const snapshots = createSnapshots()
		mockedListFocusViews.mockResolvedValue(createViews())
		mockedGetFocusViewTasks.mockImplementation(async ({ viewKey }) => snapshots[viewKey])
		mockedUpdateProjectTaskStatus.mockImplementation(async () => {
			snapshots.focus = {
				...snapshots.focus,
				tasks: [],
			}

			return {
				taskId: 'task-focus-1',
				status: 'done',
				completedAt: '2026-04-20T11:00:00Z',
				updatedAt: '2026-04-20T11:00:00Z',
			}
		})

		render(<FocusWorkspaceHarness />)

		await screen.findByText('收口 Focus 查询')
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '切换状态 收口 Focus 查询' }))
		})

		await waitFor(() => {
			expect(mockedUpdateProjectTaskStatus).toHaveBeenCalledWith({
				spaceSlug: 'work',
				projectId: 'project-1',
				taskId: 'task-focus-1',
				status: 'done',
			})
		})

		expect(await screen.findByRole('status')).toHaveTextContent('已完成“收口 Focus 查询”')
		expect(screen.queryByText('收口 Focus 查询')).not.toBeInTheDocument()
	})

	it('pin 状态切换失败后展示错误提示', async () => {
		const snapshots = createSnapshots()
		mockedListFocusViews.mockResolvedValue(createViews())
		mockedGetFocusViewTasks.mockImplementation(async ({ viewKey }) => snapshots[viewKey])
		mockedUpdateTaskPinState.mockRejectedValue(new Error('pin update rejected'))

		render(<FocusWorkspaceHarness />)

		await screen.findByText('收口 Focus 查询')
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '切换 pin 收口 Focus 查询' }))
		})

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('pin update rejected')
		})

		expect(screen.getByText('收口 Focus 查询')).toBeInTheDocument()
	})
})

function FocusWorkspaceHarness() {
	const {
		views,
		activeViewKey,
		recentTimeWindow,
		summaries,
		tasks,
		feedback,
		loadError,
		setActiveViewKey,
		setRecentTimeWindow,
		toggleTaskPin,
		toggleTaskStatus,
	} = useFocusWorkspace('work')

	return (
		<div>
			<div>
				{views.map((view) => (
					<span key={view.id}>{view.name}</span>
				))}
			</div>
			<div>
				{summaries.map((summary) => (
					<span key={summary.key}>{`${summary.label}:${summary.count}`}</span>
				))}
			</div>
			<button onClick={() => setActiveViewKey('focus')} type='button'>
				切换到 focus
			</button>
			<button onClick={() => setActiveViewKey('upcoming')} type='button'>
				切换到 upcoming
			</button>
			<button onClick={() => setActiveViewKey('recent')} type='button'>
				切换到 recent
			</button>
			<button onClick={() => setRecentTimeWindow('7d')} type='button'>
				时间窗 7d
			</button>
			<span>{`当前视图:${activeViewKey}`}</span>
			<span>{`当前时间窗:${recentTimeWindow}`}</span>
			{feedback ? <p role='status'>{feedback}</p> : null}
			{loadError ? <p role='alert'>{loadError}</p> : null}
			<div>
				{tasks.map((task) => (
					<div key={task.id}>
						<span>{task.title}</span>
						<span>{`${task.title}:${task.pinned ? '已 Pin' : '未 Pin'}`}</span>
						<button onClick={() => void toggleTaskPin(task)} type='button'>
							{`切换 pin ${task.title}`}
						</button>
						<button onClick={() => void toggleTaskStatus(task)} type='button'>
							{`切换状态 ${task.title}`}
						</button>
					</div>
				))}
			</div>
		</div>
	)
}

function createViews() {
	return [
		{
			id: 'view-focus',
			key: 'focus' as const,
			name: 'Focus',
			sortOrder: 0,
			isEnabled: true,
		},
		{
			id: 'view-upcoming',
			key: 'upcoming' as const,
			name: 'Upcoming',
			sortOrder: 1,
			isEnabled: true,
		},
		{
			id: 'view-recent',
			key: 'recent' as const,
			name: '最近添加',
			sortOrder: 2,
			isEnabled: true,
		},
		{
			id: 'view-priority',
			key: 'high_priority' as const,
			name: '高优先级',
			sortOrder: 3,
			isEnabled: true,
		},
	]
}

function createSnapshots() {
	return {
		focus: {
			view: createViews()[0],
			tasks: [
				createTask({
					id: 'task-focus-1',
					title: '收口 Focus 查询',
					pinned: true,
				}),
			],
		},
		upcoming: {
			view: createViews()[1],
			tasks: [
				createTask({
					id: 'task-upcoming-1',
					title: '补齐 pin 动作',
					pinned: false,
					dueAt: '2026-04-21T08:00:00Z',
				}),
			],
		},
		recent: {
			view: createViews()[2],
			tasks: [
				createTask({
					id: 'task-recent-1',
					title: '最近一周新增',
					createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
				}),
				createTask({
					id: 'task-recent-2',
					title: '很早之前的任务',
					createdAt: '2025-01-01T08:00:00Z',
				}),
			],
		},
		high_priority: {
			view: createViews()[3],
			tasks: [
				createTask({
					id: 'task-priority-1',
					title: '优先冲刺',
					priority: 'urgent',
				}),
			],
		},
	}
}

function createTask(
	overrides: Partial<{
		id: string
		title: string
		note: string | null
		priority: string
		status: 'todo' | 'done'
		pinned: boolean
		dueAt: string | null
		createdAt: string
		updatedAt: string
	}> = {},
) {
	return {
		id: 'task-1',
		projectId: 'project-1',
		title: '默认任务',
		note: '用于验证 Focus 工作台',
		priority: 'high',
		status: 'todo' as const,
		pinned: false,
		dueAt: null,
		createdAt: '2026-04-20T08:00:00Z',
		updatedAt: '2026-04-20T09:00:00Z',
		...overrides,
	}
}
