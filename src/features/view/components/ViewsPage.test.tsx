import type { ReactNode } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import { ShellRouteProvider } from '@/app/navigation'
import { parseShellRoute } from '@/app/navigation'
import { renderWithMatchedRoute } from '@/test/renderWithRouter'
import { ViewsPage } from '@/features/view/components/ViewsPage'

const loadTaskViewsSpy = vi.fn<() => Promise<void>>()
const runTaskViewSpy =
	vi.fn<
		(input: {
			scope: { type: string }
			viewId: string | null
			viewKey: string | null
		}) => Promise<void>
	>()
const refreshTaskRunSpy = vi.fn<() => Promise<void>>()
const loadSidebarSpy = vi.fn<(scope: { type: string }) => Promise<void>>()
const openDrawerSpy = vi.fn<(kind: string, id: string) => void>()
const openTaskCreateDialogSpy = vi.fn<(draft?: unknown) => void>()

const mockViews = [
	{
		id: 'today',
		name: 'Today',
		kind: 'system' as const,
		systemKey: 'today' as const,
		scope: { type: 'all' as const },
		filters: {},
		sort: [{ field: 'dueAt' as const, direction: 'asc' as const }],
		groupBy: 'none' as const,
		position: 100,
		createdAt: '2026-05-03T10:00:00Z',
		updatedAt: '2026-05-03T10:00:00Z',
	},
	{
		id: 'upcoming',
		name: 'Upcoming',
		kind: 'system' as const,
		systemKey: 'upcoming' as const,
		scope: { type: 'all' as const },
		filters: {},
		sort: [{ field: 'plannedAt' as const, direction: 'asc' as const }],
		groupBy: 'none' as const,
		position: 200,
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
				title: '系统视图任务',
				note: null,
				status: 'todo' as const,
				statusChangedAt: '2026-05-03T10:00:00Z',
				priority: 4,
				dueAt: '2026-05-03',
				plannedAt: null,
				remindAt: null,
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
		viewId: null,
		viewKey: 'today',
	},
}

type MockTaskRunState =
	| typeof mockTaskRunState
	| {
			item: null
			status: 'loading' | 'ready' | 'error'
			error: string | null
			input: null
	  }

const mockViewQueryState: {
	taskViews: typeof mockViews
	taskRun: MockTaskRunState
} = {
	taskViews: mockViews,
	taskRun: mockTaskRunState,
}

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => ({
		activeDetail: null,
		isOpen: false,
		openDrawer: openDrawerSpy,
		closeDrawer: vi.fn(),
		openPage: vi.fn(),
	}),
}))

vi.mock('@/features/shell-dialogs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/shell-dialogs')>()
	return {
		...actual,
		useDialogStore: (selector: (state: unknown) => unknown) =>
			selector({
				openTaskCreateDialog: openTaskCreateDialogSpy,
			}),
	}
})

vi.mock('@/features/project', () => ({
	useProjectOptions: (scope: { type: string }) => {
		loadSidebarSpy(scope)
		return [{ id: 'project-1', name: '阶段 8', spaceId: 'space-1' }]
	},
}))

vi.mock('@/features/space', () => ({
	useSpaces: () => ({
		spaces: [{ id: 'space-1', name: '工作' }],
		status: 'ready',
		error: null,
		refetch: vi.fn(),
	}),
}))

vi.mock('@/features/view/hooks/view.queries', () => ({
	useViewsQuery: () => {
		loadTaskViewsSpy()
		return {
			data: mockViewQueryState.taskViews,
			isError: false,
			isLoading: false,
			isPending: false,
			error: null,
			refetch: loadTaskViewsSpy,
		}
	},
	useTaskViewRunQuery: (
		input: { scope: { type: string }; viewId: string | null; viewKey: string | null } | null,
	) => {
		if (input) {
			runTaskViewSpy(input)
		}

		return {
			data: mockViewQueryState.taskRun.item,
			isError: mockViewQueryState.taskRun.status === 'error',
			isLoading: mockViewQueryState.taskRun.status === 'loading',
			isPending: mockViewQueryState.taskRun.status === 'loading',
			error: mockViewQueryState.taskRun.error,
			refetch: refreshTaskRunSpy,
		}
	},
}))

vi.mock('@/features/view/hooks/view.mutations', () => ({
	useCreateViewMutation: () => ({
		mutateAsync: vi.fn(),
	}),
	useUpdateViewMutation: () => ({
		mutateAsync: vi.fn(),
	}),
	useDeleteViewMutation: () => ({
		mutateAsync: vi.fn(),
	}),
	useToggleViewVisibleMutation: () => ({
		mutateAsync: vi.fn(),
	}),
	useReorderViewsMutation: () => ({
		mutateAsync: vi.fn(),
	}),
}))
vi.mock('@/shared/events', () => ({
	useTaskChangedListener:
		vi.fn<(scope: unknown, onTaskChanged: (payload: unknown) => void) => void>(),
}))

vi.mock('@/features/task', async () => {
	const { buildTaskCommandSelection } =
		await import('@/features/task/model/buildTaskCommandSelection')
	return {
		buildTaskCommandSelection,
		useTaskCollectionScene: (input: {
			source: { items: Array<{ id: string; title: string; projectName?: string | null }> }
			fallbackSubtitle: string
			onCreateTask: () => void
			empty: {
				emptyActionLabel?: string
				emptyDescription?: string
				emptyTitle?: string
			}
		}) => {
			const clearTaskSelection = vi.fn()
			return {
				boardProps: {
					emptyActionLabel: input.empty.emptyActionLabel,
					emptyDescription: input.empty.emptyDescription,
					emptyTitle: input.empty.emptyTitle ?? '',
					onEmptyAction: input.onCreateTask,
					tasks: input.source.items,
				},
				selectedCount: 1,
				clearTaskSelection,
			}
		},
		useTaskListController: () => ({
			pendingTaskId: null,
			updateTaskPriority: vi.fn<(task: unknown, priority: unknown) => Promise<void>>(),
			updateTaskStatus: vi.fn<(task: unknown, status: unknown) => Promise<void>>(),
			toggleTaskStatus: vi.fn<(task: unknown) => Promise<void>>(),
			archiveListTask: vi.fn<(task: unknown) => Promise<void>>(),
			deleteListTask: vi.fn<(task: unknown) => Promise<void>>(),
		}),
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
			focusedTaskId: null,
			setFocusedTaskId: vi.fn(),
			moveFocus: vi.fn(),
			selectTaskIds: vi.fn(),
		}),
		useRegisterTaskPreviewSource: vi.fn(),
		useTaskPreviewController: () => ({
			closePreview: vi.fn(),
			openPreview: vi.fn(),
		}),
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
		formatTaskStatusLabel: (status: string) => status,
	}
})

vi.mock('@/features/bulk-action', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/bulk-action')>()
	return {
		...actual,
		BulkActionBar: ({ selectedCount, action }: { selectedCount: number; action: ReactNode }) =>
			selectedCount > 0 ? <div>{action}</div> : null,
		BulkCommandMenuAction: () => <button type='button'>操作</button>,
	}
})

vi.mock('@/features/view/components/ViewEditorDialog', () => ({
	ViewEditorDialog: ({ open }: { open: boolean }) => (open ? <div>创建视图弹窗</div> : null),
}))

describe('ViewsPage', () => {
	beforeEach(() => {
		loadTaskViewsSpy.mockReset()
		runTaskViewSpy.mockReset()
		loadSidebarSpy.mockReset()
		openTaskCreateDialogSpy.mockReset()
		mockViewQueryState.taskViews = mockViews
		mockViewQueryState.taskRun = mockTaskRunState
	})

	it('根据 canonical view route 解析真实 viewId，并触发视图执行', async () => {
		await renderViewsPage('/all/views/today')

		await waitFor(() => {
			expect(loadTaskViewsSpy).toHaveBeenCalled()
			expect(loadSidebarSpy).toHaveBeenCalledWith({ type: 'all' })
			expect(runTaskViewSpy).toHaveBeenCalledWith({
				scope: { type: 'all' },
				viewId: null,
				viewKey: 'today',
			})
		})

		expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '视图' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
	})

	it('点击系统视图 tab 后切换到新的视图 id', async () => {
		await renderViewsPage('/all/views/today')

		fireEvent.click(screen.getByRole('tab', { name: 'Upcoming' }))

		await waitFor(() => {
			expect(runTaskViewSpy).toHaveBeenLastCalledWith({
				scope: { type: 'all' },
				viewId: null,
				viewKey: 'upcoming',
			})
		})
	})

	it('有视图但没有任务时展示更完整的空态文案', async () => {
		mockViewQueryState.taskRun = {
			...mockTaskRunState,
			item: {
				...mockTaskRunState.item,
				items: [],
			},
		}

		await renderViewsPage('/all/views/today')

		expect(screen.getByText('当前没有任务')).toBeInTheDocument()
		expect(
			screen.getByText(
				'视图「Today」下还没有符合条件的任务。点「创建任务」新增一项，或者调整一下视图条件再看看。',
			),
		).toBeInTheDocument()
	})

	it('没有可用视图时空态 CTA 打开创建视图弹窗', async () => {
		mockViewQueryState.taskViews = []
		mockViewQueryState.taskRun = {
			item: null,
			status: 'ready',
			error: null,
			input: null,
		}

		await renderViewsPage('/all/views/today')

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

function renderViewsPage(
	initialEntry: string,
	options: {
		node?: ReactNode
		wrap?: (children: ReactNode) => ReactNode
	} = {},
) {
	return renderWithMatchedRoute(options.node ?? <ViewsPage />, {
		initialEntry,
		path: '/all/views/$viewId',
		wrap: (children) => {
			const content = (
				<ShellRouteProvider shellRoute={parseShellRoute(initialEntry)}>
					{children}
				</ShellRouteProvider>
			)

			return options.wrap ? options.wrap(content) : content
		},
	})
}
