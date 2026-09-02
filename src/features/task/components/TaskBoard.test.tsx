import { act, fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react'
import {
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
	type ReactElement,
	type ReactNode,
} from 'react'

import { BulkActionProvider } from '@/features/bulk-action'
import {
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	COMMAND_IDS,
	createEmptyCommandContext,
	type Command,
	type CommandContext,
	type CommandInvocation,
} from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { useCollectionInteraction, type CollectionFocusIntent } from '@/features/selection'
import {
	TaskBoard,
	type TaskBoardPagination,
	type TaskBoardProps,
} from '@/features/task/components/TaskBoard'
import { focusTaskBoardTaskId } from '@/features/task/components/taskBoardFocus'
import {
	buildTaskBoardItemOffsets,
	buildTaskBoardFlatItems,
	type TaskBoardCustomSection,
} from '@/features/task/model/taskBoardModel'
import {
	TASK_BOARD_STATUS_ORDER,
	orderTasksByTaskBoardVisualOrder,
} from '@/features/task/model/taskBoardOrder'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import { COLLECTION_ROW_SIZE, COLLECTION_SECTION_HEADER_SIZE } from '@/shared/components/board'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

vi.mock('@/features/task/components/useTaskContextMenuBulkActions', () => ({
	useTaskContextMenuBulkActions: () => ({}),
}))

vi.mock('@/features/task/components/TaskRowAdapter', async () => {
	const { createContext, useContext } = await import('react')
	type Frame = {
		gridCellProps: React.HTMLAttributes<HTMLDivElement>
		rowProps: React.HTMLAttributes<HTMLDivElement>
		setRowElement: (element: HTMLDivElement | null) => void
	}
	const FrameContext = createContext<Frame | null>(null)

	return {
		TaskRowAriaFrameProvider: ({ children, ...frame }: Frame & { children: ReactNode }) => (
			<FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
		),
		TaskRowAdapter: ({
			rowState,
			task,
			onContextMenuOpenChange,
		}: {
			rowState: { suppressFocusIndicator?: boolean }
			task: TaskListItem
			onContextMenuOpenChange?: (open: boolean) => void
		}) => {
			const frame = useContext(FrameContext)
			if (!frame) throw new Error('测试 TaskRowAdapter 缺少 frame')
			const ariaRowProps = { ...frame.rowProps, onClick: undefined }
			return (
				<div
					{...ariaRowProps}
					ref={frame.setRowElement}
					aria-label={`打开任务 ${task.title}`}
					data-suppress-focus-indicator={String(rowState.suppressFocusIndicator ?? false)}
					onContextMenu={() => onContextMenuOpenChange?.(true)}
				>
					<div {...frame.gridCellProps}>
						<span>{task.title}</span>
						<button aria-label={`行内操作 ${task.title}`} type='button' />
						<button
							aria-label={`关闭模拟菜单 ${task.title}`}
							type='button'
							onClick={() => onContextMenuOpenChange?.(false)}
						/>
					</div>
				</div>
			)
		},
	}
})

describe('TaskBoard', () => {
	it('状态分组通过公共 BoardSectionHeader hook 渲染批准高度', () => {
		const { container } = renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={[createTask({ id: 'task-1', title: '任务 A', status: 'todo' })]}
			/>,
		)

		const sectionHeaders = container.querySelectorAll('[data-board-section-header="true"]')
		expect(sectionHeaders.length).toBeGreaterThan(0)
		for (const sectionHeader of sectionHeaders) {
			expect(sectionHeader).toHaveStyle({ height: '36px' })
		}
	})

	it('连续选择组填满虚拟行间隙并只保留外侧圆角', () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIds={tasks.map((task) => task.id)}
				status='ready'
				tasks={tasks}
			/>,
		)

		expect(
			screen.getByRole('row', { name: '打开任务 任务 A' }).closest('[data-board-row-slot]'),
		).toHaveAttribute('data-selection-group-position', 'first')
		expect(
			screen.getByRole('row', { name: '打开任务 任务 B' }).closest('[data-board-row-slot]'),
		).toHaveAttribute('data-selection-group-position', 'last')
	})

	it('分组 header 两侧的已选行各自保持单行选择组', () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
			createTask({ id: 'task-2', title: '任务 B', status: 'doing' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIds={tasks.map((task) => task.id)}
				status='ready'
				tasks={tasks}
			/>,
		)

		for (const name of ['打开任务 任务 A', '打开任务 任务 B']) {
			expect(screen.getByRole('row', { name }).closest('[data-board-row-slot]')).toHaveAttribute(
				'data-selection-group-position',
				'single',
			)
		}
	})

	it('Shift 范围切换停在分组 header 前', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
			createTask({ id: 'task-2', title: '任务 B', status: 'doing' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={tasks}
			/>,
		)

		const firstRow = screen.getByRole('row', { name: '打开任务 任务 A' })
		act(() => firstRow.focus())
		fireEvent.keyDown(firstRow, { key: 'ArrowDown', shiftKey: true })
		await waitFor(() => expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-1'))

		fireEvent.keyDown(firstRow, { key: 'ArrowDown', shiftKey: true })
		await waitFor(() => {
			expect(firstRow).toHaveFocus()
			expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-1')
		})
	})

	it('错误态通过重试操作调用公开 onRetry', () => {
		const onRetry = vi.fn()
		renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onRetry={onRetry}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='error'
				tasks={[]}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		expect(onRetry).toHaveBeenCalledOnce()
	})

	it('续页失败时停止自动加载，只允许用户原位重试', () => {
		const onFetchNextPage = vi.fn(async () => undefined)
		const { container } = renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pagination={{
					sourceKey: 'error-query',
					loadedPageCount: 1,
					state: 'error',
					error: '加载下一页失败',
					fetchNextPage: onFetchNextPage,
				}}
				pendingTaskId={null}
				status='ready'
				tasks={[createTask({ id: 'task-1', title: '任务 A' })]}
			/>,
		)

		expect(onFetchNextPage).not.toHaveBeenCalled()
		expect(container.querySelector('[aria-live="polite"][role="status"]')).toHaveTextContent(
			'加载更多任务失败',
		)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		return waitFor(() => expect(onFetchNextPage).toHaveBeenCalledOnce())
	})

	it('sentinel 进入只发起一个续页请求，in-flight 与 append 不会连续追页', async () => {
		let resolvePage: (() => void) | undefined
		const page = new Promise<void>((resolve) => {
			resolvePage = resolve
		})
		const onFetchNextPage = vi.fn()

		function PaginationProbe() {
			const [tasks, setTasks] = useState([createTask({ id: 'task-1', title: '任务 A' })])
			const fetchNextPage = useMemo(
				() => () => {
					onFetchNextPage()
					return page.then(() => {
						setTasks((current) => [...current, createTask({ id: 'task-2', title: '任务 B' })])
					})
				},
				[],
			)

			return (
				<TaskBoardHarness
					onEmptyAction={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pagination={{
						sourceKey: 'pagination-probe',
						loadedPageCount: tasks.length,
						state: 'idle',
						totalCount: 2,
						fetchNextPage,
					}}
					pendingTaskId={null}
					status='ready'
					tasks={tasks}
				/>
			)
		}

		renderTaskBoard(<PaginationProbe />)
		await waitFor(() => expect(onFetchNextPage).toHaveBeenCalledOnce())
		fireEvent.click(screen.getByRole('button', { name: '加载更多任务' }))
		fireEvent.click(screen.getByRole('button', { name: '加载更多任务' }))
		expect(onFetchNextPage).toHaveBeenCalledOnce()

		await act(async () => resolvePage?.())
		await screen.findByRole('row', { name: '打开任务 任务 B' })
		await act(async () => Promise.resolve())
		expect(onFetchNextPage).toHaveBeenCalledOnce()
	})

	it('每轮 Board ready 后才把可见 sentinel 视为进入并请求续页', async () => {
		let resolveOldPage: (() => void) | undefined
		const oldPage = new Promise<void>((resolve) => {
			resolveOldPage = resolve
		})
		const fetchNextPage = vi
			.fn<() => Promise<void>>()
			.mockImplementationOnce(() => oldPage)
			.mockResolvedValue(undefined)

		function ReadyProbe() {
			const [status, setStatus] = useState<'loading' | 'ready'>('loading')
			return (
				<>
					<button onClick={() => setStatus('ready')} type='button'>
						完成首屏读取
					</button>
					<button onClick={() => setStatus('loading')} type='button'>
						开始新查询
					</button>
					<TaskBoardHarness
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						pagination={{
							sourceKey: 'ready-probe',
							loadedPageCount: 1,
							state: 'idle',
							totalCount: 2,
							fetchNextPage,
						}}
						pendingTaskId={null}
						status={status}
						tasks={[createTask({ id: 'task-1', title: '任务 A' })]}
					/>
				</>
			)
		}

		renderTaskBoard(<ReadyProbe />)
		expect(fetchNextPage).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('button', { name: '完成首屏读取' }))
		await waitFor(() => expect(fetchNextPage).toHaveBeenCalledOnce())

		fireEvent.click(screen.getByRole('button', { name: '开始新查询' }))
		expect(fetchNextPage).toHaveBeenCalledOnce()
		fireEvent.click(screen.getByRole('button', { name: '完成首屏读取' }))
		await waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(2))
		await act(async () => resolveOldPage?.())
	})

	it('ready 查询直接切到已缓存查询时重置分页会话且不受旧请求收尾影响', async () => {
		let resolveOldPage: (() => void) | undefined
		const oldPage = new Promise<void>((resolve) => {
			resolveOldPage = resolve
		})
		let resolveNewPage: (() => void) | undefined
		const newPage = new Promise<void>((resolve) => {
			resolveNewPage = resolve
		})
		const fetchSourceA = vi.fn(() => oldPage)
		const fetchSourceB = vi.fn(() => newPage)

		function CachedSourceProbe() {
			const [sourceKey, setSourceKey] = useState<'source-a' | 'source-b'>('source-a')
			return (
				<>
					<button onClick={() => setSourceKey('source-b')} type='button'>
						切换缓存查询
					</button>
					<TaskBoardHarness
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						pagination={{
							sourceKey,
							loadedPageCount: 1,
							state: 'idle',
							fetchNextPage: sourceKey === 'source-a' ? fetchSourceA : fetchSourceB,
						}}
						pendingTaskId={null}
						status='ready'
						tasks={[createTask({ id: 'task-1', title: '任务 A' })]}
					/>
				</>
			)
		}

		renderTaskBoard(<CachedSourceProbe />)
		await waitFor(() => expect(fetchSourceA).toHaveBeenCalledOnce())
		fireEvent.click(screen.getByRole('button', { name: '切换缓存查询' }))
		await waitFor(() => expect(fetchSourceB).toHaveBeenCalledOnce())
		await act(async () => resolveOldPage?.())
		fireEvent.click(screen.getByRole('button', { name: '加载更多任务' }))
		expect(fetchSourceB).toHaveBeenCalledOnce()
		await act(async () => resolveNewPage?.())
		expect(fetchSourceB).toHaveBeenCalledOnce()
	})

	it('普通变更不提前消费续页锚点，真实页追加后才补偿滚动位置', async () => {
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
			function (this: HTMLElement) {
				return this.dataset.scrollContainer === 'true' ? 200 : 0
			},
		)
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
			function (this: HTMLElement) {
				return this.dataset.scrollContainer === 'true' ? 960 : 0
			},
		)
		const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
		const pendingScrollEvents: Promise<void>[] = []
		const scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
			this.scrollTop = options.top ?? 0
			pendingScrollEvents.push(
				Promise.resolve().then(() => {
					this.dispatchEvent(new Event('scroll'))
				}),
			)
		})
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
			configurable: true,
			value: scrollTo,
		})
		const initialTasks = [
			...Array.from({ length: 20 }, (_, index) =>
				createTask({ id: `todo-${index}`, title: `待执行 ${index}`, status: 'todo' }),
			),
			...Array.from({ length: 20 }, (_, index) =>
				createTask({ id: `doing-${index}`, title: `进行中 ${index}`, status: 'doing' }),
			),
		]
		const onFetchNextPage = vi.fn()
		let resolvePage: (() => void) | undefined
		const page = new Promise<void>((resolve) => {
			resolvePage = resolve
		})

		function AnchorProbe() {
			const [tasks, setTasks] = useState(initialTasks)
			const [loadedPageCount, setLoadedPageCount] = useState(1)
			const fetchNextPage = useCallback(() => {
				onFetchNextPage()
				return page.then(() => {
					setTasks((current) => [
						...current,
						createTask({ id: 'doing-next-page', title: '新页进行中', status: 'doing' }),
					])
					setLoadedPageCount(2)
				})
			}, [])

			return (
				<>
					<button
						onClick={() =>
							setTasks((current) => [
								...current,
								createTask({ id: 'done-mutation', title: '普通变更', status: 'done' }),
							])
						}
						type='button'
					>
						插入折叠分组任务
					</button>
					<output data-testid='anchor-task-count'>{tasks.length}</output>
					<TaskBoardHarness
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						openSections={['todo', 'doing']}
						pagination={{
							sourceKey: 'anchor-probe',
							loadedPageCount,
							state: 'idle',
							totalCount: 42,
							fetchNextPage,
						}}
						pendingTaskId={null}
						status='ready'
						tasks={tasks}
					/>
				</>
			)
		}

		try {
			const { container } = renderTaskBoard(
				<AppScrollArea>
					<AnchorProbe />
				</AppScrollArea>,
			)
			const viewport = container.querySelector<HTMLElement>('[data-scroll-container="true"]')
			if (!viewport) throw new Error('TaskBoard scroll viewport 未挂载')
			Object.defineProperties(viewport, {
				clientHeight: { configurable: true, value: 200 },
				scrollHeight: {
					configurable: true,
					get: () =>
						Number(
							container.querySelector<HTMLElement>('[data-task-board-extent]')?.dataset
								.taskBoardExtent ?? 0,
						),
				},
			})
			await waitFor(() => expect(scrollTo).toHaveBeenCalled())
			await act(async () => {
				await Promise.all(pendingScrollEvents)
			})
			scrollTo.mockClear()
			pendingScrollEvents.length = 0

			const previousScrollTop = viewport.scrollHeight - viewport.clientHeight
			viewport.scrollTop = previousScrollTop
			fireEvent.scroll(viewport)

			await waitFor(() => expect(onFetchNextPage).toHaveBeenCalledOnce())
			fireEvent.click(screen.getByRole('button', { name: '插入折叠分组任务' }))
			await waitFor(() => expect(screen.getByTestId('anchor-task-count')).toHaveTextContent('41'))
			expect(viewport.scrollTop).toBe(previousScrollTop)
			await act(async () => resolvePage?.())
			await waitFor(() => expect(viewport.scrollTop).toBe(previousScrollTop + COLLECTION_ROW_SIZE))
			expect(onFetchNextPage).toHaveBeenCalledOnce()
		} finally {
			if (originalScrollTo) {
				Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
			} else {
				Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
			}
		}
	})

	it('分页状态如实暴露 ARIA，totalCount 不参与虚拟高度', async () => {
		const fetchNextPage = vi.fn(async () => undefined)

		function PaginationStateProbe() {
			const [state, setState] = useState<'idle' | 'loading' | 'exhausted'>('idle')
			const [totalCount, setTotalCount] = useState(100)
			const pagination: TaskBoardPagination =
				state === 'exhausted'
					? { sourceKey: 'state-probe', loadedPageCount: 1, state, totalCount }
					: {
							sourceKey: 'state-probe',
							loadedPageCount: 1,
							state,
							totalCount,
							fetchNextPage,
						}

			return (
				<>
					<button onClick={() => setTotalCount(10_000)} type='button'>
						扩大总数
					</button>
					<button onClick={() => setState('loading')} type='button'>
						切到加载中
					</button>
					<button onClick={() => setState('exhausted')} type='button'>
						切到已完成
					</button>
					<TaskBoardHarness
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						pagination={pagination}
						pendingTaskId={null}
						status='ready'
						tasks={[
							createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
							createTask({ id: 'task-2', title: '任务 B', status: 'doing' }),
						]}
					/>
				</>
			)
		}

		const { container } = renderTaskBoard(<PaginationStateProbe />)
		const grid = screen.getByRole('grid', { name: '任务列表' })
		const liveStatus = container.querySelector('[aria-live="polite"][role="status"]')
		expect(grid).toHaveAttribute('aria-rowcount', '-1')
		expect(liveStatus).toHaveTextContent('已加载 2 / 100 个任务')
		expect(container.querySelectorAll('[data-task-board-sentinel]')).toHaveLength(1)
		const extent = container.querySelector<HTMLElement>('[data-task-board-extent]')
		const initialExtent = extent?.dataset.taskBoardExtent

		fireEvent.click(screen.getByRole('button', { name: '扩大总数' }))
		await waitFor(() => expect(liveStatus).toHaveTextContent('2 / 10000'))
		expect(extent?.dataset.taskBoardExtent).toBe(initialExtent)

		fireEvent.click(screen.getByRole('button', { name: '切到加载中' }))
		await waitFor(() => expect(liveStatus).toHaveTextContent('正在加载更多任务'))
		expect(grid).toHaveAttribute('aria-rowcount', '-1')
		expect(container.querySelector('[data-task-board-sentinel]')).toHaveAttribute(
			'data-task-board-sentinel-state',
			'loading',
		)

		fireEvent.click(screen.getByRole('button', { name: '切到已完成' }))
		await waitFor(() => expect(grid).toHaveAttribute('aria-rowcount', '2'))
		expect(liveStatus).toHaveTextContent('已加载全部 2 个任务')
		expect(container.querySelectorAll('[data-task-board-sentinel]')).toHaveLength(1)
	})

	it('aria-rowindex 只按当前可导航任务连续编号，折叠分组后立即重排', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
			createTask({ id: 'task-2', title: '任务 B', status: 'todo' }),
			createTask({ id: 'task-3', title: '任务 C', status: 'doing' }),
		]

		function RowIndexProbe() {
			const [openSections, setOpenSections] = useState<readonly TaskStatus[]>(['todo', 'doing'])
			return (
				<TaskBoardHarness
					onEmptyAction={() => undefined}
					onSectionOpenChange={(_groupKey, status, open) =>
						setOpenSections((current) =>
							open ? [...current, status] : current.filter((value) => value !== status),
						)
					}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					openSections={openSections}
					pendingTaskId={null}
					status='ready'
					tasks={tasks}
				/>
			)
		}

		renderTaskBoard(<RowIndexProbe />)
		expect(screen.getByRole('row', { name: '打开任务 任务 A' })).toHaveAttribute(
			'aria-rowindex',
			'2',
		)
		expect(screen.getByRole('row', { name: '打开任务 任务 B' })).toHaveAttribute(
			'aria-rowindex',
			'3',
		)
		expect(screen.getByRole('row', { name: '打开任务 任务 C' })).toHaveAttribute(
			'aria-rowindex',
			'1',
		)

		fireEvent.click(screen.getByRole('button', { name: '折叠 进行中' }))
		await waitFor(() =>
			expect(screen.getByRole('row', { name: '打开任务 任务 A' })).toHaveAttribute(
				'aria-rowindex',
				'1',
			),
		)
		expect(screen.getByRole('row', { name: '打开任务 任务 B' })).toHaveAttribute(
			'aria-rowindex',
			'2',
		)
		expect(screen.queryByRole('row', { name: '打开任务 任务 C' })).not.toBeInTheDocument()
	})

	it('Grid 提供 row/gridcell，Arrow/Home/End 移动真实 DOM 焦点', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
			createTask({ id: 'task-3', title: '任务 C' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={tasks}
			/>,
		)

		const grid = screen.getByRole('grid', { name: '任务列表' })
		const rows = within(grid).getAllByRole('row')
		expect(rows).toHaveLength(3)
		for (const row of rows) expect(within(row).getByRole('gridcell')).toBeInTheDocument()

		act(() => rows[0]?.focus())
		fireEvent.keyDown(rows[0]!, { key: 'ArrowDown' })
		await waitFor(() => expect(rows[1]).toHaveFocus())
		fireEvent.keyDown(rows[1]!, { key: 'j' })
		await waitFor(() => expect(rows[2]).toHaveFocus())
		fireEvent.keyDown(rows[2]!, { key: 'k' })
		await waitFor(() => expect(rows[1]).toHaveFocus())
		fireEvent.keyDown(rows[1]!, { key: 'End' })
		await waitFor(() => expect(rows[2]).toHaveFocus())
		fireEvent.keyDown(rows[2]!, { key: 'Home' })
		await waitFor(() => expect(rows[0]).toHaveFocus())
	})
	it('键盘 Peek 打开和切行时隐藏行边框，关闭后恢复且不搬走焦点', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
		]
		function PeekProbe() {
			const [open, setOpen] = useState(false)
			return (
				<TaskCommandTestProvider
					onCommand={(commandId) => {
						if (commandId === COMMAND_IDS.taskPeek) setOpen((current) => !current)
					}}
				>
					<TaskBoardHarness
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						pendingTaskId={null}
						status='ready'
						suppressFocusIndicator={open}
						tasks={tasks}
					/>
				</TaskCommandTestProvider>
			)
		}

		renderTaskBoard(<PeekProbe />)
		const rows = screen.getAllByRole('row')
		act(() => rows[0]?.focus())

		fireEvent.keyDown(rows[0]!, { key: ' ' })
		await waitFor(() => {
			expect(rows[0]).toHaveFocus()
			expect(rows[0]).toHaveAttribute('data-suppress-focus-indicator', 'true')
			expect(rows[1]).toHaveAttribute('data-suppress-focus-indicator', 'true')
		})

		fireEvent.keyDown(rows[0]!, { key: 'ArrowDown' })
		await waitFor(() => {
			expect(rows[1]).toHaveFocus()
			expect(rows[1]).toHaveAttribute('data-suppress-focus-indicator', 'true')
		})

		fireEvent.keyDown(rows[1]!, { key: ' ' })
		await waitFor(() => {
			expect(rows[1]).toHaveFocus()
			expect(rows[1]).toHaveAttribute('data-suppress-focus-indicator', 'false')
		})
	})
	it('右键不改变选择，菜单关闭后只恢复触发行焦点', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
			createTask({ id: 'task-3', title: '任务 C' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIds={['task-1', 'task-2']}
				status='ready'
				tasks={tasks}
			/>,
		)

		const rowB = screen.getByRole('row', { name: '打开任务 任务 B' })
		fireEvent.contextMenu(rowB)
		await waitFor(() => {
			expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-1,task-2')
			expect(screen.getByTestId('focused-key')).toHaveTextContent('none')
		})

		const closeMenuB = screen.getByRole('button', { name: '关闭模拟菜单 任务 B' })
		fireEvent.click(closeMenuB)
		await waitFor(() => expect(rowB).toHaveFocus())

		const rowC = screen.getByRole('row', { name: '打开任务 任务 C' })
		fireEvent.contextMenu(rowC)
		await waitFor(() => {
			expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-1,task-2')
			expect(screen.getByTestId('focused-key')).toHaveTextContent('task-2')
		})
	})
	it('离屏与 overscan 已挂载 key 都先滚进 sticky-safe 可见区再聚焦', async () => {
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
			function (this: HTMLElement) {
				return this.dataset.scrollContainer === 'true' ? 720 : 0
			},
		)
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
			function (this: HTMLElement) {
				return this.dataset.scrollContainer === 'true' ? 960 : 0
			},
		)
		const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
		const pendingScrollEvents: Promise<void>[] = []
		const scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
			this.scrollTop = options.top ?? 0
			pendingScrollEvents.push(
				Promise.resolve().then(() => {
					this.dispatchEvent(new Event('scroll'))
				}),
			)
		})
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
			configurable: true,
			value: scrollTo,
		})
		const tasks = Array.from({ length: 100 }, (_, index) =>
			createTask({ id: `task-${index}`, title: `任务 ${index}` }),
		)
		const flatItems = buildTaskBoardFlatItems({
			tasks,
			openSections: TASK_BOARD_STATUS_ORDER,
		})
		const itemOffsets = buildTaskBoardItemOffsets(flatItems)
		try {
			renderTaskBoard(
				<AppScrollArea>
					<TaskBoardHarness
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						pendingTaskId={null}
						status='ready'
						tasks={tasks}
					/>
				</AppScrollArea>,
			)

			const viewport = document.querySelector<HTMLElement>('[data-scroll-container="true"]')
			if (!viewport) throw new Error('TaskBoard scroll viewport 未挂载')
			Object.defineProperties(viewport, {
				clientHeight: { configurable: true, value: 720 },
				scrollHeight: { configurable: true, value: 4_684 },
			})
			await waitFor(() => expect(scrollTo).toHaveBeenCalled())
			await act(async () => {
				await Promise.all(pendingScrollEvents)
			})
			scrollTo.mockClear()
			pendingScrollEvents.length = 0

			act(() => focusTaskBoardTaskId('task-80'))
			await act(async () => {
				await Promise.all(pendingScrollEvents)
			})

			await waitFor(() =>
				expect(screen.getByRole('row', { name: '打开任务 任务 80' })).toHaveFocus(),
			)
			expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: expect.any(Number) }))

			viewport.scrollTop += COLLECTION_ROW_SIZE / 2
			fireEvent.scroll(viewport)
			const viewportEnd = viewport.scrollTop + viewport.clientHeight
			const partialRowIndex = [...document.querySelectorAll<HTMLElement>('[data-index]')]
				.map((element) => Number(element.dataset.index))
				.find((index) => {
					const item = flatItems[index]
					const start = itemOffsets[index]
					return (
						item?.kind === 'row' &&
						start !== undefined &&
						start < viewportEnd &&
						start + COLLECTION_ROW_SIZE > viewportEnd
					)
				})
			if (partialRowIndex === undefined) throw new Error('未挂载底部部分可见 row')
			const partialRowItem = flatItems[partialRowIndex]
			if (partialRowItem?.kind !== 'row') throw new Error('部分可见 index 不是任务行')
			const partialRow = screen.getByRole('row', {
				name: `打开任务 ${partialRowItem.task.title}`,
			})
			scrollTo.mockClear()
			fireEvent.pointerMove(partialRow)
			expect(scrollTo).not.toHaveBeenCalled()

			const stickyHeader = document.querySelector<HTMLElement>('[data-task-board-sticky-header]')
			await waitFor(() => expect(stickyHeader).not.toHaveAttribute('aria-hidden'))
			const viewportStart = viewport.scrollTop + COLLECTION_SECTION_HEADER_SIZE
			const overscanIndex = [...document.querySelectorAll<HTMLElement>('[data-index]')]
				.map((element) => Number(element.dataset.index))
				.filter((index) => {
					const item = flatItems[index]
					const start = itemOffsets[index]
					return (
						item?.kind === 'row' &&
						start !== undefined &&
						start + COLLECTION_ROW_SIZE <= viewportStart
					)
				})
				.sort((left, right) => right - left)[0]
			if (overscanIndex === undefined) throw new Error('未挂载视口上方 overscan row')
			const overscanItem = flatItems[overscanIndex]
			if (overscanItem?.kind !== 'row') throw new Error('overscan index 不是任务行')
			const overscanStart = itemOffsets[overscanIndex]
			if (overscanStart === undefined) throw new Error('overscan row 缺少 offset')
			expect(
				screen.getByRole('row', { name: `打开任务 ${overscanItem.task.title}` }),
			).toBeInTheDocument()

			scrollTo.mockClear()
			pendingScrollEvents.length = 0
			act(() => focusTaskBoardTaskId(overscanItem.task.id))
			await act(async () => {
				await Promise.all(pendingScrollEvents)
			})

			expect(scrollTo).toHaveBeenCalledWith({
				top: Math.max(0, overscanStart - COLLECTION_SECTION_HEADER_SIZE),
			})
			await waitFor(() =>
				expect(
					screen.getByRole('row', { name: `打开任务 ${overscanItem.task.title}` }),
				).toHaveFocus(),
			)
		} finally {
			if (originalScrollTo) {
				Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
			} else {
				Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
			}
		}
	})

	it('最后一项删除后 stable id 失效时聚焦空态主操作', async () => {
		function EmptyFallbackProbe() {
			const [tasks, setTasks] = useState([createTask({ id: 'task-1', title: '任务 A' })])
			useLayoutEffect(() => {
				if (tasks.length === 0) {
					focusTaskBoardTaskId('task-1')
				}
			}, [tasks.length])

			return (
				<>
					<button onClick={() => setTasks([])} type='button'>
						删除最后一项
					</button>
					<TaskBoardHarness
						emptyActionLabel='创建任务'
						emptyTitle='当前没有任务'
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						pendingTaskId={null}
						status='ready'
						tasks={tasks}
					/>
				</>
			)
		}

		renderTaskBoard(<EmptyFallbackProbe />)
		fireEvent.click(screen.getByRole('button', { name: '删除最后一项' }))
		await waitFor(() => expect(screen.getByRole('button', { name: '创建任务' })).toHaveFocus())
	})
	it('可见 sticky 分组右键不改 selection/focus，动作仍一次更新 selection', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
			createTask({ id: 'task-2', title: '任务 B', status: 'todo' }),
			createTask({ id: 'task-3', title: '任务 C', status: 'doing' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={tasks}
			/>,
		)

		fireEvent.pointerMove(screen.getByRole('row', { name: '打开任务 任务 C' }))
		await waitFor(() => expect(screen.getByTestId('focused-key')).toHaveTextContent('task-3'))

		const visibleHeader = screen
			.getByRole('button', { name: '折叠 待执行' })
			.closest('[data-board-section-header]')
		fireEvent.contextMenu(visibleHeader!)
		await screen.findByRole('menu', { name: '分区操作' })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('none')
		expect(screen.getByTestId('focused-key')).toHaveTextContent('task-3')
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中全部' }))
		await waitFor(() => {
			expect(screen.getByRole('row', { name: '打开任务 任务 A' })).toHaveAttribute(
				'aria-selected',
				'true',
			)
			expect(screen.getByRole('row', { name: '打开任务 任务 B' })).toHaveAttribute(
				'aria-selected',
				'true',
			)
		})
		expect(screen.getByTestId('focused-key')).toHaveTextContent('task-3')
		await waitFor(() => expect(screen.getByRole('button', { name: '折叠 待执行' })).toHaveFocus())
	})
})
function renderTaskBoard(element: ReactElement): RenderResult {
	return renderWithInteractionProviders(
		<DangerConfirmProvider>
			<BulkActionProvider actions={[]}>{element}</BulkActionProvider>
		</DangerConfirmProvider>,
	)
}

function TaskCommandTestProvider({
	children,
	onCommand,
}: {
	children: ReactNode
	onCommand: (commandId: string, context: CommandContext, invocation: CommandInvocation) => void
}) {
	const context = useMemo(() => createEmptyCommandContext(), [])
	const runtime = useMemo(() => {
		const commands: Command[] = [
			COMMAND_IDS.taskPeek,
			COMMAND_IDS.taskOpenDetail,
			COMMAND_IDS.taskComplete,
			COMMAND_IDS.taskArchive,
			COMMAND_IDS.taskDelete,
			COMMAND_IDS.taskSetPriority,
			COMMAND_IDS.taskSetStatus,
			COMMAND_IDS.taskOpenDateMenu,
			COMMAND_IDS.taskChangePlacement,
		].map((commandId) => ({
			id: commandId,
			title: commandId,
			category: 'task',
			scope: ['task-list'],
			run: (target, invocation) => onCommand(commandId, target, invocation),
		}))
		return new CommandRuntime({
			registry: new CommandRegistry(commands),
			getContext: () => context,
		})
	}, [context, onCommand])

	return (
		<CommandRuntimeProvider context={context} runtime={runtime}>
			{children}
		</CommandRuntimeProvider>
	)
}

type TaskBoardHarnessProps = Omit<
	TaskBoardProps,
	| 'collectionInteraction'
	| 'flatItems'
	| 'focusIntent'
	| 'onCollapseAll'
	| 'onExpandAll'
	| 'onFocusIntentConsumed'
	| 'pagination'
	| 'onRetry'
	| 'onSectionOpenChange'
> & {
	customSections?: readonly TaskBoardCustomSection[]
	focusIntent?: CollectionFocusIntent<string, string> | null
	onFocusIntentConsumed?: (intent: CollectionFocusIntent<string, string>) => void
	onSectionOpenChange?: TaskBoardProps['onSectionOpenChange']
	pagination?: TaskBoardPagination
	onRetry?: TaskBoardProps['onRetry']
	openSections?: readonly TaskStatus[]
	selectedTaskIds?: readonly string[]
}

function TaskBoardHarness({
	customSections,
	focusIntent = null,
	onFocusIntentConsumed = () => undefined,
	onSectionOpenChange = () => undefined,
	pagination = { sourceKey: 'test', loadedPageCount: 1, state: 'exhausted' },
	onRetry = () => undefined,
	openSections = TASK_BOARD_STATUS_ORDER,
	selectedTaskIds = [],
	...props
}: TaskBoardHarnessProps) {
	const flatItems = useMemo(
		() =>
			buildTaskBoardFlatItems({
				tasks: props.tasks,
				openSections,
				customSections,
			}),
		[customSections, openSections, props.tasks],
	)
	const eligibleKeys = useMemo(
		() =>
			orderTasksByTaskBoardVisualOrder(props.tasks, {
				statusOrder: TASK_BOARD_STATUS_ORDER,
				customSections,
			}).map((task) => task.id),
		[customSections, props.tasks],
	)
	const navigableKeys = useMemo(
		() => flatItems.flatMap((item) => (item.kind === 'row' ? [item.key] : [])),
		[flatItems],
	)
	const collectionInteraction = useCollectionInteraction({
		eligibleKeys,
		navigableKeys,
		defaultSelectedKeys: selectedTaskIds,
	})

	return (
		<>
			<TaskBoard
				{...props}
				collectionInteraction={collectionInteraction}
				flatItems={flatItems}
				focusIntent={focusIntent}
				onCollapseAll={() => undefined}
				onExpandAll={() => undefined}
				onFocusIntentConsumed={onFocusIntentConsumed}
				pagination={pagination}
				onRetry={onRetry}
				onSectionOpenChange={onSectionOpenChange}
			/>
			<output data-testid='focused-key'>{collectionInteraction.focusedKey ?? 'none'}</output>
			<output data-testid='selected-keys'>
				{[...collectionInteraction.selectedKeys].join(',') || 'none'}
			</output>
		</>
	)
}

function createTask(
	overrides: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title'>,
): TaskListItem {
	return {
		id: overrides.id,
		title: overrides.title,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '工作',
		spaceSlug: overrides.spaceSlug ?? 'work',
		projectId: overrides.projectId ?? null,
		projectName: overrides.projectName ?? null,
		status: overrides.status ?? 'todo',
		statusChangedAt: overrides.statusChangedAt ?? '2026-06-28T10:00:00.000Z',
		priority: overrides.priority ?? 0,
		dueAt: overrides.dueAt ?? null,
		plannedAt: overrides.plannedAt ?? null,
		remindAt: overrides.remindAt ?? null,
		completedAt: overrides.completedAt ?? null,
		canceledAt: overrides.canceledAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-06-28T09:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-28T11:00:00.000Z',
	}
}
