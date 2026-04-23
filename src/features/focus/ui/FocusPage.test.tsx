import { fireEvent, render, screen } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { useFocusWorkspace } from '@/features/focus/model/useFocusWorkspace'
import { FocusPage } from '@/features/focus/ui/FocusPage'

vi.mock('@/features/focus/model/useFocusWorkspace', () => ({
	useFocusWorkspace: vi.fn<typeof useFocusWorkspace>(),
}))

const mockedUseFocusWorkspace = useFocusWorkspace as unknown as ReturnType<
	typeof vi.fn<typeof useFocusWorkspace>
>

describe('FocusPage', () => {
	beforeAll(() => {
		Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
			configurable: true,
			value: () => false,
		})
		Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
			configurable: true,
			value: () => undefined,
		})
		Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
			configurable: true,
			value: () => undefined,
		})
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: () => undefined,
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			currentSpaceId: 'default',
			activeSection: 'focus',
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

	it('渲染 Views tabs 和任务列表', () => {
		const refresh = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
		mockedUseFocusWorkspace.mockReturnValue(createWorkspaceState({ refresh }))

		render(<FocusPage />)

		expect(screen.getByText('Views')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '筛选' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: 'Focus' })).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: 'Upcoming' })).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: 'Focus 1 手动置顶的执行任务' }),
		).not.toBeInTheDocument()
		expect(screen.getByText('收口 Focus 查询')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '刷新' }))

		expect(refresh).toHaveBeenCalledTimes(1)
	})

	it('切换 tab 时调用工作台状态更新', () => {
		const setActiveViewKey =
			vi.fn<(viewKey: 'focus' | 'upcoming' | 'recent' | 'high_priority') => void>()
		mockedUseFocusWorkspace.mockReturnValue(
			createWorkspaceState({
				setActiveViewKey,
			}),
		)

		render(<FocusPage />)

		fireEvent.click(screen.getByRole('tab', { name: 'Upcoming' }))

		expect(setActiveViewKey).toHaveBeenCalledWith('upcoming')
	})

	it('最近添加视图中支持切换时间窗', async () => {
		const setRecentTimeWindow = vi.fn<(window: '7d' | '30d' | 'all') => void>()
		mockedUseFocusWorkspace.mockReturnValue(
			createWorkspaceState({
				activeViewKey: 'recent',
				recentTimeWindow: 'all',
				setRecentTimeWindow,
				tasks: [
					{
						id: 'task-recent-1',
						projectId: 'project-1',
						title: '最近一周新增',
						note: null,
						priority: 'high',
						status: 'todo',
						pinned: false,
						dueAt: null,
						createdAt: '2026-04-20T08:00:00Z',
						updatedAt: '2026-04-20T09:00:00Z',
					},
				],
			}),
		)

		render(<FocusPage />)

		fireEvent.pointerDown(screen.getByRole('button', { name: '筛选' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '最近 7 天' }))

		expect(setRecentTimeWindow).toHaveBeenCalledWith('7d')
	})

	it('点击任务行时打开 Task Drawer', () => {
		mockedUseFocusWorkspace.mockReturnValue(createWorkspaceState())

		render(<FocusPage />)

		fireEvent.click(screen.getByRole('button', { name: '打开任务 收口 Focus 查询' }))

		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-focus-1',
		})
	})

	it('点击列表动作时调用真实工作台动作而不是打开 Drawer', () => {
		const toggleTaskPin = vi
			.fn<
				(
					task: Parameters<ReturnType<typeof useFocusWorkspace>['toggleTaskPin']>[0],
				) => Promise<void>
			>()
			.mockResolvedValue(undefined)
		const toggleTaskStatus = vi
			.fn<
				(
					task: Parameters<ReturnType<typeof useFocusWorkspace>['toggleTaskStatus']>[0],
				) => Promise<void>
			>()
			.mockResolvedValue(undefined)
		mockedUseFocusWorkspace.mockReturnValue(
			createWorkspaceState({
				toggleTaskPin,
				toggleTaskStatus,
			}),
		)

		render(<FocusPage />)

		fireEvent.click(screen.getByRole('button', { name: '取消 pin 收口 Focus 查询' }))
		fireEvent.click(screen.getByRole('button', { name: '标记完成 收口 Focus 查询' }))

		expect(toggleTaskPin).toHaveBeenCalledTimes(1)
		expect(toggleTaskStatus).toHaveBeenCalledTimes(1)
		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
		})
	})

	it('展示加载、失败和空状态', () => {
		mockedUseFocusWorkspace.mockReturnValue(
			createWorkspaceState({
				isLoading: true,
				tasks: [],
				loadError: 'focus request failed',
			}),
		)

		render(<FocusPage />)

		expect(screen.getByRole('status')).toHaveTextContent('正在加载 Focus...')
		expect(screen.getByRole('alert')).toHaveTextContent('focus request failed')
	})
})

function createWorkspaceState(
	overrides: Partial<ReturnType<typeof useFocusWorkspace>> = {},
): ReturnType<typeof useFocusWorkspace> {
	return {
		views: [
			{
				id: 'view-focus',
				key: 'focus',
				name: 'Focus',
				sortOrder: 0,
				isEnabled: true,
			},
			{
				id: 'view-upcoming',
				key: 'upcoming',
				name: 'Upcoming',
				sortOrder: 1,
				isEnabled: true,
			},
			{
				id: 'view-recent',
				key: 'recent',
				name: '最近添加',
				sortOrder: 2,
				isEnabled: true,
			},
			{
				id: 'view-priority',
				key: 'high_priority',
				name: '高优先级',
				sortOrder: 3,
				isEnabled: true,
			},
		],
		activeViewKey: 'focus',
		recentTimeWindow: 'all',
		summaries: [
			{
				key: 'focus',
				label: 'Focus',
				description: '手动置顶的执行任务',
				count: 1,
			},
			{
				key: 'upcoming',
				label: 'Upcoming',
				description: '按截止时间排序的任务',
				count: 2,
			},
			{
				key: 'recent',
				label: '最近添加',
				description: '按创建时间回看新增任务',
				count: 3,
			},
			{
				key: 'high_priority',
				label: '高优先级',
				description: '聚合 high 与 urgent',
				count: 1,
			},
		],
		tasks: [
			{
				id: 'task-focus-1',
				projectId: 'project-1',
				title: '收口 Focus 查询',
				note: '验证真实 Focus 工作台',
				priority: 'high',
				status: 'todo',
				pinned: true,
				dueAt: null,
				createdAt: '2026-04-20T08:00:00Z',
				updatedAt: '2026-04-20T09:00:00Z',
			},
		],
		isLoading: false,
		loadError: null,
		feedback: null,
		pendingTaskId: null,
		setActiveViewKey: vi.fn<(viewKey: 'focus' | 'upcoming' | 'recent' | 'high_priority') => void>(),
		setRecentTimeWindow: vi.fn<(window: '7d' | '30d' | 'all') => void>(),
		refresh: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		toggleTaskPin: vi
			.fn<
				(task: {
					id: string
					projectId: string
					title: string
					note: string | null
					priority: string
					status: 'todo' | 'done'
					pinned: boolean
					dueAt: string | null
					createdAt: string
					updatedAt: string
				}) => Promise<void>
			>()
			.mockResolvedValue(undefined),
		toggleTaskStatus: vi
			.fn<
				(task: {
					id: string
					projectId: string
					title: string
					note: string | null
					priority: string
					status: 'todo' | 'done'
					pinned: boolean
					dueAt: string | null
					createdAt: string
					updatedAt: string
				}) => Promise<void>
			>()
			.mockResolvedValue(undefined),
		...overrides,
	}
}
