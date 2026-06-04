import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

import { CommandSelectionProvider, useCommandSelectionContext } from '@/features/selection/model'
import { ViewsPage } from '@/features/views/ui/ViewsPage'

const loadTaskViewsSpy = vi.fn<() => Promise<void>>()
const runTaskViewSpy =
	vi.fn<(input: { scope: { type: string }; viewId: string }) => Promise<void>>()
const refreshTaskRunSpy = vi.fn<() => Promise<void>>()
const createTaskViewSpy = vi.fn<(input: unknown) => Promise<unknown>>()
const updateTaskViewSpy = vi.fn<(input: unknown) => Promise<unknown>>()
const deleteTaskViewSpy = vi.fn<(viewId: string) => Promise<void>>()
const toggleTaskViewVisibleSpy = vi.fn<(viewId: string, visible: boolean) => Promise<unknown>>()
const reorderTaskViewsSpy = vi.fn<(input: unknown) => Promise<unknown>>()
const loadSidebarSpy = vi.fn<(scope: { type: string }) => Promise<void>>()
const openDrawerSpy = vi.fn<(kind: string, id: string) => void>()
const openTaskCreateDialogSpy = vi.fn<(draft?: unknown) => void>()

const mockViews = [
	{
		id: 'view-today',
		name: 'Today',
		description: '今天计划、今天截止和已经逾期的任务会显示在这里。',
		type: 'system' as const,
		entityType: 'task' as const,
		key: 'today',
		filters: {},
		sort: [{ field: 'dueAt' as const, direction: 'asc' as const }],
		groupBy: 'none' as const,
		isVisible: true,
		sortOrder: 100,
		createdAt: '2026-05-03T10:00:00Z',
		updatedAt: '2026-05-03T10:00:00Z',
	},
	{
		id: 'view-upcoming',
		name: 'Upcoming',
		description: '未来计划和未来截止的任务会显示在这里。',
		type: 'system' as const,
		entityType: 'task' as const,
		key: 'upcoming',
		filters: {},
		sort: [{ field: 'scheduledAt' as const, direction: 'asc' as const }],
		groupBy: 'none' as const,
		isVisible: true,
		sortOrder: 200,
		createdAt: '2026-05-03T10:00:00Z',
		updatedAt: '2026-05-03T10:00:00Z',
	},
]

const mockTaskRunState = {
	item: {
		view: mockViews[0],
		items: [
			{
				id: 'task-1',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				projectId: 'project-1',
				projectName: '阶段 8',
				inboxAt: null,
				title: '系统视图任务',
				note: null,
				status: 'todo' as const,
				statusChangedAt: '2026-05-03T10:00:00Z',
				priority: 4,
				dueAt: '2026-05-03',
				scheduledAt: null,
				reminderAt: null,
				completedAt: null,
				canceledAt: null,
				archivedAt: null,
				createdAt: '2026-05-03T10:00:00Z',
				updatedAt: '2026-05-03T10:00:00Z',
			},
		],
		groups: [],
	},
	status: 'ready' as const,
	error: null,
	input: {
		scope: { type: 'all' as const },
		viewId: 'view-today',
	},
}

const mockViewStoreState = {
	taskViews: {
		items: mockViews,
		status: 'ready' as const,
		error: null,
		entityType: 'task' as const,
	},
	taskRun: mockTaskRunState,
	loadTaskViews: loadTaskViewsSpy,
	runTaskView: runTaskViewSpy,
	refreshTaskRun: refreshTaskRunSpy,
	createTaskView: createTaskViewSpy,
	updateTaskView: updateTaskViewSpy,
	deleteTaskView: deleteTaskViewSpy,
	toggleTaskViewVisible: toggleTaskViewVisibleSpy,
	reorderTaskViews: reorderTaskViewsSpy,
}

vi.mock('@/app/layouts/shell/model/useDrawerStore', () => ({
	useDrawerStore: (selector: (state: unknown) => unknown) =>
		selector({
			activeDrawerId: null,
			activeDrawerKind: null,
			openDrawer: openDrawerSpy,
		}),
}))

vi.mock('@/app/layouts/shell/model/useDialogStore', () => ({
	useDialogStore: (selector: (state: unknown) => unknown) =>
		selector({
			openTaskCreateDialog: openTaskCreateDialogSpy,
		}),
}))

vi.mock('@/features/project/model/useProjectStore', () => ({
	selectProjectOptions: (state: {
		options: Array<{ id: string; name: string; spaceId: string }>
	}) => state.options,
	useProjectStore: (selector: (state: unknown) => unknown) =>
		selector({
			options: [{ id: 'project-1', name: '阶段 8', spaceId: 'space-1' }],
			loadSidebar: loadSidebarSpy,
		}),
}))

vi.mock('@/features/view/model/useViewStore', () => ({
	selectTaskViews: (state: typeof mockViewStoreState) => state.taskViews,
	selectTaskViewRun: (state: typeof mockViewStoreState) => state.taskRun,
	useViewStore: (selector: (state: typeof mockViewStoreState) => unknown) =>
		selector(mockViewStoreState),
}))

vi.mock('@/shared/events', () => ({
	useTaskChangedListener:
		vi.fn<(scope: unknown, onTaskChanged: (payload: unknown) => void) => void>(),
}))

vi.mock('@/features/task/model/useTaskListController', () => ({
	useTaskListController: () => ({
		pendingTaskId: null,
		updateTaskPriority: vi.fn<(task: unknown, priority: unknown) => Promise<void>>(),
		updateTaskStatus: vi.fn<(task: unknown, status: unknown) => Promise<void>>(),
		toggleTaskStatus: vi.fn<(task: unknown) => Promise<void>>(),
		archiveListTask: vi.fn<(task: unknown) => Promise<void>>(),
		deleteListTask: vi.fn<(task: unknown) => Promise<void>>(),
	}),
}))

vi.mock('@/features/task/model/useTaskSelection', () => ({
	useTaskSelection: () => ({
		selectedTaskIdSet: new Set(['task-1']),
		selectionSnapshot: {
			type: 'task',
			ids: ['task-1'],
			idSet: new Set(['task-1']),
			count: 1,
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		},
		selectedCount: 1,
		toggleTaskSelection: vi.fn<(taskId: string) => void>(),
		clearTaskSelection: vi.fn<() => void>(),
	}),
}))

vi.mock('@/features/task/detail', () => ({
	useRegisterTaskPreviewSource: vi.fn(),
	useTaskPreviewController: () => ({
		closePreview: vi.fn(),
		openPreview: vi.fn(),
	}),
}))

vi.mock('@/features/task/ui/TaskBoard', () => ({
	TaskBoard: ({
		emptyActionLabel,
		emptyDescription,
		emptyTitle,
		onEmptyAction,
		tasks,
	}: {
		emptyActionLabel?: string
		emptyDescription?: string
		emptyTitle: string
		onEmptyAction?: () => void
		tasks: Array<{ title: string }>
	}) => (
		<div>
			<div>{emptyTitle}</div>
			{emptyDescription ? <div>{emptyDescription}</div> : null}
			{emptyActionLabel && onEmptyAction ? (
				<button onClick={onEmptyAction} type='button'>
					{emptyActionLabel}
				</button>
			) : null}
			<div>{tasks.map((task) => task.title).join(',')}</div>
		</div>
	),
}))

vi.mock('@/features/bulk-action', () => ({
	BulkActionBar: ({ selectedCount, action }: { selectedCount: number; action: ReactNode }) =>
		selectedCount > 0 ? <div>{action}</div> : null,
	BulkCommandMenuAction: () => <button type='button'>操作</button>,
}))

vi.mock('@/features/view/ui/ViewEditorDialog', () => ({
	ViewEditorDialog: ({ open }: { open: boolean }) => (open ? <div>创建视图弹窗</div> : null),
}))

describe('ViewsPage', () => {
	beforeEach(() => {
		loadTaskViewsSpy.mockReset()
		runTaskViewSpy.mockReset()
		loadSidebarSpy.mockReset()
		openTaskCreateDialogSpy.mockReset()
		mockViewStoreState.taskViews.items = mockViews
		mockViewStoreState.taskRun = mockTaskRunState
	})

	it('根据 canonical view route 解析真实 viewId，并触发视图执行', async () => {
		render(
			<MemoryRouter initialEntries={['/all/views/today']}>
				<Routes>
					<Route path='/all/views/:viewId' element={<ViewsPage />} />
				</Routes>
			</MemoryRouter>,
		)

		await waitFor(() => {
			expect(loadTaskViewsSpy).toHaveBeenCalled()
			expect(loadSidebarSpy).toHaveBeenCalledWith({ type: 'all' })
			expect(runTaskViewSpy).toHaveBeenCalledWith({
				scope: { type: 'all' },
				viewId: 'view-today',
			})
		})

		expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '视图' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
	})

	it('点击系统视图 tab 后切换到新的视图 id', async () => {
		render(
			<MemoryRouter initialEntries={['/all/views/view-today']}>
				<Routes>
					<Route path='/all/views/:viewId' element={<ViewsPage />} />
				</Routes>
			</MemoryRouter>,
		)

		fireEvent.click(screen.getByRole('tab', { name: 'Upcoming' }))

		await waitFor(() => {
			expect(runTaskViewSpy).toHaveBeenLastCalledWith({
				scope: { type: 'all' },
				viewId: 'view-upcoming',
			})
		})
	})

	it('注册当前视图选择到 Command selection context', async () => {
		render(
			<CommandSelectionProvider>
				<MemoryRouter initialEntries={['/all/views/view-today']}>
					<Routes>
						<Route
							path='/all/views/:viewId'
							element={
								<>
									<ViewsPage />
									<CommandSelectionProbe />
								</>
							}
						/>
					</Routes>
				</MemoryRouter>
			</CommandSelectionProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId('command-selection-probe')).toHaveTextContent(
				JSON.stringify({
					ids: ['task-1'],
					entities: [
						{
							id: 'task-1',
							type: 'task',
							title: '系统视图任务',
							subtitle: '阶段 8',
							spaceId: 'space-1',
							projectId: 'project-1',
							inboxAt: null,
							dueAt: '2026-05-03',
							status: 'todo',
							priority: '4',
						},
					],
					source: 'task-list',
					hasSelection: true,
				}),
			)
		})
	})

	it('有视图但没有任务时展示更完整的空态文案', () => {
		mockViewStoreState.taskRun = {
			...mockTaskRunState,
			item: {
				...mockTaskRunState.item,
				items: [],
			},
		}

		render(
			<MemoryRouter initialEntries={['/all/views/view-today']}>
				<Routes>
					<Route path='/all/views/:viewId' element={<ViewsPage />} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText('当前没有任务')).toBeInTheDocument()
		expect(
			screen.getByText(
				'视图「Today」下还没有符合条件的任务。点「创建任务」新增一项，或者调整一下视图条件再看看。',
			),
		).toBeInTheDocument()
	})

	it('没有可用视图时空态 CTA 打开创建视图弹窗', () => {
		mockViewStoreState.taskViews.items = []
		mockViewStoreState.taskRun = {
			item: null,
			status: 'ready',
			error: null,
			input: null,
		}

		render(
			<MemoryRouter initialEntries={['/all/views/view-today']}>
				<Routes>
					<Route path='/all/views/:viewId' element={<ViewsPage />} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText('当前还没有视图')).toBeInTheDocument()
		expect(
			screen.getByText(
				'这里会显示你整理好的任务视图，现在还没准备好。点「创建视图」先建一个，后面筛选、回看和聚焦都会更顺手。',
			),
		).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '创建视图' }))
		expect(screen.getByText('创建视图弹窗')).toBeInTheDocument()
	})
})

function CommandSelectionProbe() {
	const selection = useCommandSelectionContext()
	return (
		<output data-testid='command-selection-probe'>
			{JSON.stringify({
				ids: selection.ids,
				entities: selection.entities,
				source: selection.source,
				hasSelection: selection.hasSelection,
			})}
		</output>
	)
}
