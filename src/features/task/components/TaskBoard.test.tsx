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
import { useDialogStore } from '@/features/shell-dialogs'
import {
	TaskBoard,
	type TaskBoardPagination,
	type TaskBoardProps,
} from '@/features/task/components/TaskBoard'
import { focusTaskBoardTaskId } from '@/features/task/components/taskBoardFocus'
import {
	buildTaskBoardItemOffsets,
	buildTaskBoardFlatItems,
	measureTaskBoardFlatSize,
} from '@/features/task/model/taskBoardModel'
import { buildTaskBoardCollection } from '@/features/task/model/taskBoardCollection'
import type { TaskDisplaySection } from '@/features/display-options'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { indexTasksById } from '@/features/task/model/taskCollectionIndex'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import {
	COLLECTION_ITEM_GAP,
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_STRIDE,
	COLLECTION_SECTION_HEADER_HEIGHT,
	COLLECTION_SECTION_HEADER_STRIDE,
} from '@/shared/components/board'
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
			expect(sectionHeader.parentElement).toHaveClass('block', 'w-full')
		}
	})

	it('非状态组可折叠并选中隐藏的已加载成员，展开后保持选择与菜单焦点', async () => {
		const tasks = [
			createTask({ id: 'high-a', title: '高优先级 A', priority: 4 }),
			createTask({ id: 'high-b', title: '高优先级 B', priority: 4 }),
			createTask({ id: 'low-c', title: '低优先级 C', priority: 1 }),
		]
		const onSectionOpenChange = vi.fn()
		function GroupProbe() {
			const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<readonly string[]>([])
			return (
				<TaskBoardHarness
					tasks={tasks}
					sections={[
						{ key: 'priority:4', label: '紧急', tasks: tasks.slice(0, 2), totalCount: 2 },
						{ key: 'priority:1', label: '低', tasks: tasks.slice(2), totalCount: 1 },
					]}
					collapsedGroupKeys={collapsedGroupKeys}
					onSectionOpenChange={(groupKey, open) => {
						onSectionOpenChange(groupKey, open)
						setCollapsedGroupKeys(open ? [] : [groupKey])
					}}
					onEmptyAction={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pendingTaskId={null}
				/>
			)
		}
		renderTaskBoard(<GroupProbe />)
		const trigger = screen.getByRole('button', { name: '折叠 紧急' })
		fireEvent.click(trigger)
		expect(onSectionOpenChange).toHaveBeenCalledWith('h:priority:4', false)
		expect(trigger).toHaveAttribute('aria-expanded', 'false')
		expect(screen.queryByRole('row', { name: '打开任务 高优先级 A' })).not.toBeInTheDocument()
		expect(screen.queryByRole('row', { name: '打开任务 高优先级 B' })).not.toBeInTheDocument()
		fireEvent.contextMenu(trigger.closest('[data-board-section-header]')!)
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中全部' }))
		await waitFor(() =>
			expect(screen.getByTestId('selected-keys')).toHaveTextContent('high-a,high-b'),
		)
		expect(screen.getByRole('row', { name: '打开任务 低优先级 C' })).toHaveAttribute(
			'aria-selected',
			'false',
		)
		expect(screen.queryByRole('button', { name: '在 紧急 中创建任务' })).not.toBeInTheDocument()
		await waitFor(() => expect(trigger).toHaveFocus())
		fireEvent.click(screen.getByRole('button', { name: '展开 紧急' }))
		expect(onSectionOpenChange).toHaveBeenLastCalledWith('h:priority:4', true)
		for (const title of ['高优先级 A', '高优先级 B']) {
			expect(screen.getByRole('row', { name: `打开任务 ${title}` })).toHaveAttribute(
				'aria-selected',
				'true',
			)
		}
	})

	it('同组追加成员后保留一个组头，部分选中时选中全部包含新增成员', async () => {
		const tasks = [
			createTask({ id: 'project-a', title: '项目任务 A' }),
			createTask({ id: 'project-b', title: '项目任务 B' }),
			createTask({ id: 'project-c', title: '项目任务 C' }),
		]
		function AppendProbe() {
			const [loadedCount, setLoadedCount] = useState(2)
			const loadedTasks = tasks.slice(0, loadedCount)
			return (
				<>
					<button type='button' onClick={() => setLoadedCount(3)}>
						追加下一页
					</button>
					<TaskBoardHarness
						tasks={loadedTasks}
						sections={[
							{ key: 'project:alpha', label: '项目甲', tasks: loadedTasks, totalCount: 3 },
						]}
						selectedTaskIds={['project-a']}
						pagination={
							loadedCount === 3
								? { sourceKey: 'append', loadedPageCount: 2, totalCount: 3, state: 'exhausted' }
								: {
										sourceKey: 'append',
										loadedPageCount: 1,
										totalCount: 3,
										state: 'loading',
										fetchNextPage: async () => undefined,
									}
						}
						onEmptyAction={() => undefined}
						onToggleTaskStatus={async () => undefined}
						onUpdateTaskPriority={async () => undefined}
						onUpdateTaskStatus={async () => undefined}
						pendingTaskId={null}
					/>
				</>
			)
		}
		const { container } = renderTaskBoard(<AppendProbe />)
		const initialTrigger = screen.getByRole('button', { name: '折叠 项目甲' })
		expect(initialTrigger).toHaveAccessibleDescription('项目甲，共 3 个任务，已加载 2 个')
		const initialHeader = initialTrigger.closest('[data-board-section-header]')!
		expect(
			initialHeader.querySelector('[data-board-section-header-slot="count"]'),
		).toHaveTextContent('3 · 已加载 2')
		const initialExtent = Number(
			container.querySelector('[data-task-board-extent]')?.getAttribute('data-task-board-extent'),
		)
		expect(initialExtent).toBe(
			COLLECTION_SECTION_HEADER_STRIDE + 2 * COLLECTION_ROW_STRIDE + COLLECTION_ROW_HEIGHT,
		)
		expect(container.querySelectorAll('[data-task-board-sentinel]')).toHaveLength(1)
		expect(screen.getAllByRole('row')).toHaveLength(2)
		expect(screen.queryByRole('row', { name: '打开任务 项目任务 C' })).not.toBeInTheDocument()
		fireEvent.contextMenu(initialHeader)
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中已加载任务' }))
		await waitFor(() =>
			expect(screen.getByTestId('selected-keys')).toHaveTextContent(/^project-a,project-b$/),
		)
		fireEvent.contextMenu(initialHeader)
		expect(await screen.findByRole('menuitem', { name: '取消选中已加载任务' })).toBeInTheDocument()
		fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
		await waitFor(() => expect(initialTrigger).toHaveFocus())
		fireEvent.click(screen.getByRole('button', { name: '追加下一页' }))
		expect(screen.getAllByRole('button', { name: '折叠 项目甲' })).toHaveLength(1)
		const completeTrigger = screen.getByRole('button', { name: '折叠 项目甲' })
		expect(completeTrigger).toHaveAccessibleDescription('项目甲，共 3 个任务，已加载 3 个')
		expect(
			completeTrigger
				.closest('[data-board-section-header]')
				?.querySelector('[data-board-section-header-slot="count"]'),
		).toHaveTextContent(/^3$/)
		expect(container.querySelector('[data-task-board-extent]')).toHaveAttribute(
			'data-task-board-extent',
			String(initialExtent),
		)
		expect(container.querySelectorAll('[data-task-board-sentinel]')).toHaveLength(0)
		expect(screen.getByRole('row', { name: '打开任务 项目任务 C' })).toHaveAttribute(
			'aria-selected',
			'false',
		)
		fireEvent.contextMenu(
			screen.getByRole('button', { name: '折叠 项目甲' }).closest('[data-board-section-header]')!,
		)
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中全部' }))
		await waitFor(() =>
			expect(screen.getByTestId('selected-keys')).toHaveTextContent(
				'project-a,project-b,project-c',
			),
		)
	})

	it('零成员父子组保留真实标题与状态创建，禁用选择且折叠全部恢复父按钮', async () => {
		const parentKey = 'h:priority:4'
		const childKey = `h:${JSON.stringify(['priority:4', 'status:todo'])}`
		const collapseAll = vi.fn()
		function EmptyGroupsProbe() {
			const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<readonly string[]>([])
			const [focusIntent, setFocusIntent] = useState<CollectionFocusIntent<string, string> | null>(
				null,
			)
			return (
				<TaskBoardHarness
					tasks={[]}
					sections={[
						{
							key: 'priority:4',
							label: '紧急',
							tasks: [],
							totalCount: 0,
							children: [
								{
									key: JSON.stringify(['priority:4', 'status:todo']),
									label: '待执行',
									status: 'todo',
									tasks: [],
									totalCount: 0,
								},
							],
						},
					]}
					collapsedGroupKeys={collapsedGroupKeys}
					focusIntent={focusIntent}
					onFocusIntentConsumed={() => setFocusIntent(null)}
					onSectionOpenChange={(key, open) =>
						setCollapsedGroupKeys((current) =>
							open ? current.filter((value) => value !== key) : [...current, key],
						)
					}
					onCollapseAll={(restoreGroupKey) => {
						collapseAll(restoreGroupKey)
						setCollapsedGroupKeys([parentKey, childKey])
						setFocusIntent({
							type: 'group-trigger',
							groupKey: restoreGroupKey,
							reentry: { type: 'root' },
						})
					}}
					createProjectId='project-alpha'
					emptyTitle='当前没有任务'
					onEmptyAction={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pendingTaskId={null}
				/>
			)
		}
		useDialogStore.setState(useDialogStore.getInitialState())
		try {
			const { container } = renderTaskBoard(<EmptyGroupsProbe />)
			expect(screen.queryByText('当前没有任务')).not.toBeInTheDocument()
			expect(screen.queryAllByRole('row')).toHaveLength(0)
			const childTrigger = screen.getByRole('button', { name: '折叠 紧急 › 待执行' })
			expect(childTrigger).toHaveAccessibleDescription('紧急 › 待执行，共 0 个任务，已加载 0 个')
			expect(container.querySelector('[data-task-board-extent]')).toHaveAttribute(
				'data-task-board-extent',
				String(COLLECTION_SECTION_HEADER_STRIDE + COLLECTION_SECTION_HEADER_HEIGHT),
			)
			fireEvent.contextMenu(childTrigger.closest('[data-board-section-header]')!)
			const selectAll = await screen.findByRole('menuitem', { name: '选中全部' })
			expect(selectAll).toHaveAttribute('aria-disabled', 'true')
			fireEvent.click(selectAll)
			expect(screen.getByTestId('selected-keys')).toHaveTextContent(/^none$/)
			fireEvent.click(screen.getByRole('menuitem', { name: '折叠该分区' }))
			await waitFor(() =>
				expect(screen.getByRole('button', { name: '展开 紧急 › 待执行' })).toHaveFocus(),
			)
			fireEvent.click(screen.getByRole('button', { name: '展开 紧急 › 待执行' }))
			fireEvent.contextMenu(
				screen
					.getByRole('button', { name: '折叠 紧急 › 待执行' })
					.closest('[data-board-section-header]')!,
			)
			fireEvent.click(await screen.findByRole('menuitem', { name: '折叠全部' }))
			expect(collapseAll).toHaveBeenCalledWith(parentKey)
			await waitFor(() => expect(screen.getByRole('button', { name: '展开 紧急' })).toHaveFocus())
			expect(screen.queryByRole('button', { name: '展开 紧急 › 待执行' })).not.toBeInTheDocument()
			fireEvent.click(screen.getByRole('button', { name: '展开 紧急' }))
			fireEvent.click(screen.getByRole('button', { name: '在 紧急 › 待执行 中创建任务' }))
			expect(useDialogStore.getState().taskCreateDraft).toEqual({
				projectId: 'project-alpha',
				status: 'todo',
			})
		} finally {
			useDialogStore.setState(useDialogStore.getInitialState())
		}
	})

	it('父子组按完整路径折叠与选择，同名子组独立且父组展开保留子组折叠', async () => {
		const tasks = [
			createTask({ id: 'high-doing', title: '紧急进行中', priority: 4, status: 'doing' }),
			createTask({ id: 'high-todo', title: '紧急待执行', priority: 4 }),
			createTask({ id: 'low-todo', title: '低优先级待执行', priority: 1 }),
		]
		const sections = priorityStatusSectionFixture(tasks)
		function NestedGroupProbe() {
			const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<readonly string[]>([])
			return (
				<TaskBoardHarness
					tasks={tasks}
					sections={sections}
					collapsedGroupKeys={collapsedGroupKeys}
					onSectionOpenChange={(groupKey, open) =>
						setCollapsedGroupKeys((current) =>
							open ? current.filter((key) => key !== groupKey) : [...current, groupKey],
						)
					}
					onEmptyAction={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pendingTaskId={null}
				/>
			)
		}
		renderTaskBoard(<NestedGroupProbe />)
		fireEvent.click(screen.getByRole('button', { name: '折叠 紧急 › 待执行' }))
		expect(screen.queryByRole('row', { name: '打开任务 紧急待执行' })).not.toBeInTheDocument()
		expect(screen.getByRole('row', { name: '打开任务 低优先级待执行' })).toHaveAttribute(
			'aria-rowindex',
			'2',
		)
		fireEvent.contextMenu(
			screen.getByRole('button', { name: '折叠 紧急' }).closest('[data-board-section-header]')!,
		)
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中全部' }))
		await waitFor(() =>
			expect(screen.getByTestId('selected-keys')).toHaveTextContent(/^high-doing,high-todo$/),
		)
		expect(screen.getByRole('row', { name: '打开任务 低优先级待执行' })).toHaveAttribute(
			'aria-selected',
			'false',
		)
		fireEvent.click(screen.getByRole('button', { name: '折叠 紧急' }))
		expect(screen.queryByRole('button', { name: '展开 紧急 › 待执行' })).not.toBeInTheDocument()
		expect(screen.queryByRole('row', { name: '打开任务 紧急进行中' })).not.toBeInTheDocument()
		expect(screen.getByRole('row', { name: '打开任务 低优先级待执行' })).toHaveAttribute(
			'aria-rowindex',
			'1',
		)
		fireEvent.click(screen.getByRole('button', { name: '展开 紧急' }))
		const childTrigger = screen.getByRole('button', { name: '展开 紧急 › 待执行' })
		expect(childTrigger).toHaveAttribute('aria-expanded', 'false')
		fireEvent.contextMenu(childTrigger.closest('[data-board-section-header]')!)
		fireEvent.click(await screen.findByRole('menuitem', { name: '取消选中全部' }))
		await waitFor(() =>
			expect(screen.getByTestId('selected-keys')).toHaveTextContent(/^high-doing$/),
		)
		await waitFor(() => expect(childTrigger).toHaveFocus())
		fireEvent.click(childTrigger)
		expect(screen.getByRole('row', { name: '打开任务 紧急待执行' })).toHaveAttribute(
			'aria-selected',
			'false',
		)
	})

	it('Shift 范围选择停在兄弟叶组边界，状态子组创建只使用自身动作元数据', async () => {
		const tasks = [
			createTask({ id: 'high-doing', title: '紧急进行中', priority: 4, status: 'doing' }),
			createTask({ id: 'high-todo', title: '紧急待执行', priority: 4 }),
		]
		useDialogStore.setState(useDialogStore.getInitialState())
		try {
			renderTaskBoard(
				<TaskBoardHarness
					tasks={tasks}
					sections={priorityStatusSectionFixture(tasks)}
					createProjectId='project-alpha'
					onEmptyAction={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pendingTaskId={null}
				/>,
			)
			const firstRow = screen.getByRole('row', { name: '打开任务 紧急进行中' })
			act(() => firstRow.focus())
			fireEvent.keyDown(firstRow, { key: 'ArrowDown', shiftKey: true })
			fireEvent.keyDown(firstRow, { key: 'ArrowDown', shiftKey: true })
			await waitFor(() => expect(firstRow).toHaveFocus())
			expect(screen.getByTestId('selected-keys')).toHaveTextContent(/^high-doing$/)
			expect(screen.queryByRole('button', { name: '在 紧急 中创建任务' })).not.toBeInTheDocument()
			fireEvent.click(screen.getByRole('button', { name: '在 紧急 › 进行中 中创建任务' }))
			expect(useDialogStore.getState().taskCreateDraft).toMatchObject({
				projectId: 'project-alpha',
				status: 'doing',
			})
		} finally {
			act(() => useDialogStore.getState().closeTaskCreateDialog())
		}
	})

	it('没有任务焦点时从子组菜单折叠全部，显式恢复父组按钮', async () => {
		const tasks = [createTask({ id: 'high-todo', title: '紧急待执行', priority: 4 })]
		const sections = priorityStatusSectionFixture(tasks)
		const onCollapseAll = vi.fn()
		function CollapseAllProbe() {
			const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<readonly string[]>([])
			const [focusIntent, setFocusIntent] = useState<CollectionFocusIntent<string, string> | null>(
				null,
			)
			return (
				<TaskBoardHarness
					tasks={tasks}
					sections={sections}
					collapsedGroupKeys={collapsedGroupKeys}
					focusIntent={focusIntent}
					onFocusIntentConsumed={() => setFocusIntent(null)}
					onCollapseAll={(restoreGroupKey) => {
						onCollapseAll(restoreGroupKey)
						setCollapsedGroupKeys(['h:priority:4'])
						setFocusIntent({
							type: 'group-trigger',
							groupKey: restoreGroupKey,
							reentry: { type: 'root' },
						})
					}}
					onEmptyAction={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pendingTaskId={null}
				/>
			)
		}
		renderTaskBoard(<CollapseAllProbe />)
		expect(screen.getByTestId('focused-key')).toHaveTextContent('none')
		fireEvent.contextMenu(
			screen
				.getByRole('button', { name: '折叠 紧急 › 待执行' })
				.closest('[data-board-section-header]')!,
		)
		fireEvent.click(await screen.findByRole('menuitem', { name: '折叠全部' }))
		expect(onCollapseAll).toHaveBeenCalledWith('h:priority:4')
		expect(screen.queryByRole('button', { name: '折叠 紧急 › 待执行' })).not.toBeInTheDocument()
		await waitFor(() => expect(screen.getByRole('button', { name: '展开 紧急' })).toHaveFocus())
	})

	it('创建动作使用状态元数据预填项目与状态，不从非状态标签推断动作', () => {
		const tasks = [
			createTask({ id: 'task-a', title: '任务 A', status: 'doing', priority: 4 }),
			createTask({ id: 'task-b', title: '任务 B' }),
		]
		useDialogStore.setState(useDialogStore.getInitialState())
		try {
			renderTaskBoard(
				<TaskBoardHarness
					tasks={tasks}
					sections={[
						{
							key: 'status:doing',
							label: '处理队列',
							status: 'doing',
							tasks: tasks.slice(0, 1),
							totalCount: 1,
							children: [
								{
									key: JSON.stringify(['status:doing', 'priority:4']),
									label: '紧急',
									tasks: tasks.slice(0, 1),
									totalCount: 1,
								},
							],
						},
						{ key: 'project:todo', label: '待执行', tasks: tasks.slice(1), totalCount: 1 },
					]}
					createProjectId='project-alpha'
					onEmptyAction={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pendingTaskId={null}
				/>,
			)
			expect(screen.getByRole('button', { name: '折叠 待执行' })).toBeInTheDocument()
			expect(screen.queryByRole('button', { name: '在 待执行 中创建任务' })).not.toBeInTheDocument()
			expect(screen.getByRole('button', { name: '折叠 处理队列 › 紧急' })).toBeInTheDocument()
			expect(
				screen.queryByRole('button', { name: '在 处理队列 › 紧急 中创建任务' }),
			).not.toBeInTheDocument()
			fireEvent.click(screen.getByRole('button', { name: '在 处理队列 中创建任务' }))
			expect(useDialogStore.getState()).toMatchObject({
				createDialogType: 'task',
				taskCreateDraft: { projectId: 'project-alpha', status: 'doing' },
			})
		} finally {
			act(() => useDialogStore.getState().closeTaskCreateDialog())
		}
	})

	it('单成员组全部选中后可取消，保留其他组的选择', async () => {
		const tasks = [
			createTask({ id: 'todo-a', title: '待执行 A', status: 'todo' }),
			createTask({ id: 'doing-b', title: '进行中 B', status: 'doing' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				tasks={tasks}
				selectedTaskIds={['todo-a', 'doing-b']}
				onEmptyAction={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
			/>,
		)
		const trigger = screen.getByRole('button', { name: '折叠 待执行' })
		fireEvent.contextMenu(trigger.closest('[data-board-section-header]')!)
		fireEvent.click(await screen.findByRole('menuitem', { name: '取消选中全部' }))
		await waitFor(() => expect(screen.getByTestId('selected-keys')).toHaveTextContent(/^doing-b$/))
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

	it('续页失败时停止自动加载，支持原位重试与从首屏恢复', async () => {
		const onFetchNextPage = vi.fn(async () => undefined)
		const restartFromFirstPage = vi.fn(async () => undefined)
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
					restartFromFirstPage,
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
		await waitFor(() => expect(onFetchNextPage).toHaveBeenCalledOnce())
		fireEvent.click(screen.getByRole('button', { name: '从头加载' }))
		await waitFor(() => expect(restartFromFirstPage).toHaveBeenCalledOnce())
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
		const loadingRegion = screen.getByLabelText('正在读取任务')
		expect(loadingRegion).toHaveAttribute('aria-busy', 'true')
		expect(loadingRegion).toBeEmptyDOMElement()
		expect(fetchNextPage).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('button', { name: '完成首屏读取' }))
		expect(screen.queryByLabelText('正在读取任务')).not.toBeInTheDocument()
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
				createTask({
					id: `todo-${index}`,
					title: `待执行 ${index}`,
					status: 'todo',
				}),
			),
			...Array.from({ length: 20 }, (_, index) =>
				createTask({
					id: `doing-${index}`,
					title: `进行中 ${index}`,
					status: 'doing',
				}),
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
						createTask({
							id: 'doing-next-page',
							title: '新页进行中',
							status: 'doing',
						}),
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
								createTask({
									id: 'done-mutation',
									title: '普通变更',
									status: 'done',
								}),
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
						collapsedGroupKeys={['h:status:done', 'h:status:canceled']}
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
			await waitFor(() =>
				expect(viewport.scrollTop).toBe(previousScrollTop + COLLECTION_ROW_STRIDE),
			)
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
					<button onClick={() => setTotalCount(200)} type='button'>
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
		const flatContentHeight =
			2 * COLLECTION_SECTION_HEADER_HEIGHT + 2 * COLLECTION_ROW_HEIGHT + 3 * COLLECTION_ITEM_GAP
		expect(Number(initialExtent)).toBe(
			flatContentHeight + COLLECTION_ITEM_GAP + COLLECTION_ROW_HEIGHT,
		)

		fireEvent.click(screen.getByRole('button', { name: '扩大总数' }))
		await waitFor(() => expect(liveStatus).toHaveTextContent('2 / 200'))
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
		expect(container.querySelectorAll('[data-task-board-sentinel]')).toHaveLength(0)
		expect(Number(extent?.dataset.taskBoardExtent)).toBe(flatContentHeight)
		await waitFor(() =>
			expect(
				screen.getByRole('row', { name: '打开任务 任务 A' }).closest('[data-index]'),
			).toHaveStyle({ height: `${COLLECTION_ROW_HEIGHT}px` }),
		)
		expect(screen.queryByText('已加载全部任务')).not.toBeInTheDocument()
	})

	it('aria-rowindex 只按当前可导航任务连续编号，折叠分组后立即重排', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
			createTask({ id: 'task-2', title: '任务 B', status: 'todo' }),
			createTask({ id: 'task-3', title: '任务 C', status: 'doing' }),
		]

		function RowIndexProbe() {
			const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<readonly string[]>([])
			return (
				<TaskBoardHarness
					onEmptyAction={() => undefined}
					onSectionOpenChange={(groupKey, open) =>
						setCollapsedGroupKeys((current) =>
							open ? current.filter((key) => key !== groupKey) : [...current, groupKey],
						)
					}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					collapsedGroupKeys={collapsedGroupKeys}
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
		await waitFor(() => {
			expect(rows[1]).toHaveFocus()
			expect(grid).toHaveAttribute('data-focus-source', 'keyboard')
		})
		fireEvent.pointerDown(rows[1]!)
		expect(grid).toHaveAttribute('data-focus-source', 'pointer')
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

		const closeMenuB = screen.getByRole('button', {
			name: '关闭模拟菜单 任务 B',
		})
		fireEvent.click(closeMenuB)
		await waitFor(() => expect(rowB).toHaveFocus())

		const rowC = screen.getByRole('row', { name: '打开任务 任务 C' })
		fireEvent.contextMenu(rowC)
		await waitFor(() => {
			expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-1,task-2')
			expect(screen.getByTestId('focused-key')).toHaveTextContent('task-2')
		})
	})
	it('两级组内行与离屏父组都先滚进 sticky-safe 可见区再聚焦', async () => {
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
			createTask({ id: `task-${index}`, title: `任务 ${index}`, priority: 4 }),
		)
		const sections = priorityStatusSectionFixture(tasks)
		const flatItems = buildTaskBoardFlatItems({
			sections,
		})
		const itemOffsets = buildTaskBoardItemOffsets(flatItems)
		function FocusProbe() {
			const [focusIntent, setFocusIntent] = useState<CollectionFocusIntent<string, string> | null>(
				null,
			)
			return (
				<>
					<button
						type='button'
						onClick={() =>
							setFocusIntent({
								type: 'group-trigger',
								groupKey: 'h:priority:4',
								reentry: { type: 'root' },
							})
						}
					>
						恢复离屏父组焦点
					</button>
					<AppScrollArea>
						<TaskBoardHarness
							sections={sections}
							focusIntent={focusIntent}
							onFocusIntentConsumed={() => setFocusIntent(null)}
							onEmptyAction={() => undefined}
							onToggleTaskStatus={async () => undefined}
							onUpdateTaskPriority={async () => undefined}
							onUpdateTaskStatus={async () => undefined}
							pendingTaskId={null}
							status='ready'
							tasks={tasks}
						/>
					</AppScrollArea>
				</>
			)
		}
		try {
			renderTaskBoard(<FocusProbe />)

			const viewport = document.querySelector<HTMLElement>('[data-scroll-container="true"]')
			if (!viewport) throw new Error('TaskBoard scroll viewport 未挂载')
			Object.defineProperties(viewport, {
				clientHeight: { configurable: true, value: 720 },
				scrollHeight: { configurable: true, value: measureTaskBoardFlatSize(flatItems) },
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

			viewport.scrollTop += COLLECTION_ROW_STRIDE / 2
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
						start + COLLECTION_ROW_STRIDE > viewportEnd
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
			const viewportStart = viewport.scrollTop + COLLECTION_SECTION_HEADER_STRIDE
			const overscanIndex = [...document.querySelectorAll<HTMLElement>('[data-index]')]
				.map((element) => Number(element.dataset.index))
				.filter((index) => {
					const item = flatItems[index]
					const start = itemOffsets[index]
					return (
						item?.kind === 'row' &&
						start !== undefined &&
						start + COLLECTION_ROW_STRIDE <= viewportStart
					)
				})
				.sort((left, right) => right - left)[0]
			if (overscanIndex === undefined) throw new Error('未挂载视口上方 overscan row')
			const overscanItem = flatItems[overscanIndex]
			if (overscanItem?.kind !== 'row') throw new Error('overscan index 不是任务行')
			const overscanStart = itemOffsets[overscanIndex]
			if (overscanStart === undefined) throw new Error('overscan row 缺少 offset')
			expect(
				screen.getByRole('row', {
					name: `打开任务 ${overscanItem.task.title}`,
				}),
			).toBeInTheDocument()

			scrollTo.mockClear()
			pendingScrollEvents.length = 0
			act(() => focusTaskBoardTaskId(overscanItem.task.id))
			await act(async () => {
				await Promise.all(pendingScrollEvents)
			})

			expect(scrollTo).toHaveBeenCalledWith({
				top: Math.max(0, overscanStart - COLLECTION_SECTION_HEADER_STRIDE),
			})
			await waitFor(() =>
				expect(
					screen.getByRole('row', {
						name: `打开任务 ${overscanItem.task.title}`,
					}),
				).toHaveFocus(),
			)
			expect(screen.queryByRole('button', { name: '折叠 紧急' })).not.toBeInTheDocument()
			if (!stickyHeader) throw new Error('两级任务组缺少 sticky header')
			expect(
				within(stickyHeader).getByText('紧急 › 待执行').closest('[data-board-section-header]'),
			).toHaveStyle({ height: '36px' })
			expect(screen.getAllByRole('button', { name: '折叠 紧急 › 待执行' })).toHaveLength(1)
			scrollTo.mockClear()
			pendingScrollEvents.length = 0
			fireEvent.click(screen.getByRole('button', { name: '恢复离屏父组焦点' }))
			await act(async () => {
				await Promise.all(pendingScrollEvents)
			})
			expect(scrollTo).toHaveBeenCalledWith({ top: 0 })
			await waitFor(() => expect(screen.getByRole('button', { name: '折叠 紧急' })).toHaveFocus())
		} finally {
			if (originalScrollTo) {
				Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
			} else {
				Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
			}
		}
	})

	it.each([
		{ name: '任务行', intent: { type: 'item', key: 'late-task' } },
		{
			name: '分组按钮',
			intent: {
				type: 'group-trigger',
				groupKey: 'h:priority:1',
				reentry: { type: 'item', key: 'late-task' },
			},
		},
	] satisfies Array<{ name: string; intent: CollectionFocusIntent<string, string> }>)(
		'$name：旧窗口待挂载焦点请求不能在新窗口兑现',
		async ({ intent }) => {
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
			// 模拟平台尚未分发请求后的 scroll 事件，目标仍未进入真实虚拟挂载范围。
			const scrollTo = vi.fn()
			Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
				configurable: true,
				value: scrollTo,
			})
			const target = createTask({ id: 'late-task', title: '延后挂载任务', priority: 1 })
			const oldTasks = [
				...Array.from({ length: 80 }, (_, index) =>
					createTask({
						id: `old-${index}`,
						title: `旧窗口任务 ${index}`,
						priority: index < 40 ? 4 : 2,
					}),
				),
				target,
			]
			const oldSections: TaskDisplaySection[] = [
				{ key: 'priority:4', label: '紧急', tasks: oldTasks.slice(0, 40), totalCount: 40 },
				{ key: 'priority:2', label: '普通', tasks: oldTasks.slice(40, 80), totalCount: 40 },
				{ key: 'priority:1', label: '低', tasks: [target], totalCount: 1 },
			]
			const consumed = vi.fn()
			function WindowProbe() {
				const [phase, setPhase] = useState<'old' | 'loading' | 'ready'>('old')
				const [focusIntent, setFocusIntent] = useState<CollectionFocusIntent<
					string,
					string
				> | null>(null)
				const tasks = phase === 'old' ? oldTasks : phase === 'ready' ? [target] : []
				return (
					<>
						<button type='button' onClick={() => setFocusIntent(intent)}>
							请求旧窗口焦点
						</button>
						<button
							type='button'
							onClick={() => {
								setFocusIntent(null)
								setPhase('loading')
							}}
						>
							切换新窗口
						</button>
						<button type='button' onClick={() => setPhase('ready')}>
							新窗口返回
						</button>
						<AppScrollArea>
							<TaskBoardHarness
								tasks={tasks}
								sections={
									phase === 'old'
										? oldSections
										: [{ key: 'priority:1', label: '低', tasks, totalCount: 1 }]
								}
								status={phase === 'loading' ? 'loading' : 'ready'}
								pagination={{
									sourceKey: phase === 'old' ? 'old-window' : 'new-window',
									loadedPageCount: 1,
									state: 'exhausted',
								}}
								focusIntent={focusIntent}
								onFocusIntentConsumed={(current) => {
									consumed(current)
									setFocusIntent(null)
								}}
								onEmptyAction={() => undefined}
								onToggleTaskStatus={async () => undefined}
								onUpdateTaskPriority={async () => undefined}
								onUpdateTaskStatus={async () => undefined}
								pendingTaskId={null}
							/>
						</AppScrollArea>
					</>
				)
			}
			try {
				renderTaskBoard(<WindowProbe />)
				expect(screen.queryByRole('row', { name: '打开任务 延后挂载任务' })).not.toBeInTheDocument()
				expect(screen.queryByRole('button', { name: '折叠 低' })).not.toBeInTheDocument()
				scrollTo.mockClear()
				fireEvent.click(screen.getByRole('button', { name: '请求旧窗口焦点' }))
				expect(consumed).toHaveBeenCalledWith(intent)
				expect(scrollTo).toHaveBeenCalled()
				expect(screen.queryByRole('row', { name: '打开任务 延后挂载任务' })).not.toBeInTheDocument()
				fireEvent.click(screen.getByRole('button', { name: '切换新窗口' }))
				expect(screen.getByRole('region', { name: '正在读取任务' })).toBeInTheDocument()
				const returnButton = screen.getByRole('button', { name: '新窗口返回' })
				act(() => returnButton.focus())
				fireEvent.click(returnButton)
				expect(
					await screen.findByRole('row', { name: '打开任务 延后挂载任务' }),
				).toBeInTheDocument()
				expect(screen.getByRole('button', { name: '折叠 低' })).toBeInTheDocument()
				expect(returnButton).toHaveFocus()
				const groupTrigger = screen.getByRole('button', { name: '折叠 低' })
				act(() => groupTrigger.focus())
				fireEvent.keyDown(groupTrigger, { key: 'ArrowDown' })
				expect(groupTrigger).toHaveFocus()
			} finally {
				if (originalScrollTo)
					Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
				else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
			}
		},
	)

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

		act(() => screen.getByRole('row', { name: '打开任务 任务 C' }).focus())
		await waitFor(() => expect(screen.getByTestId('focused-key')).toHaveTextContent('task-3'))

		const visibleHeader = screen
			.getByRole('button', { name: '折叠 待执行' })
			.closest('[data-board-section-header]')
		fireEvent.contextMenu(visibleHeader!)
		const sectionMenu = await screen.findByRole('menu')
		expect(sectionMenu).toHaveAttribute('aria-label', '分区操作')
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
	| 'boardCollection'
	| 'flatItems'
	| 'focusIntent'
	| 'onCollapseAll'
	| 'onExpandAll'
	| 'onFocusIntentConsumed'
	| 'pagination'
	| 'onRetry'
	| 'onSectionOpenChange'
	| 'taskById'
> & {
	sections?: readonly TaskDisplaySection[]
	focusIntent?: CollectionFocusIntent<string, string> | null
	onFocusIntentConsumed?: (intent: CollectionFocusIntent<string, string>) => void
	onSectionOpenChange?: TaskBoardProps['onSectionOpenChange']
	onCollapseAll?: TaskBoardProps['onCollapseAll']
	pagination?: TaskBoardPagination
	onRetry?: TaskBoardProps['onRetry']
	collapsedGroupKeys?: readonly string[]
	selectedTaskIds?: readonly string[]
}

function TaskBoardHarness({
	sections,
	focusIntent = null,
	onFocusIntentConsumed = () => undefined,
	onSectionOpenChange = () => undefined,
	onCollapseAll = () => undefined,
	pagination = { sourceKey: 'test', loadedPageCount: 1, state: 'exhausted' },
	onRetry = () => undefined,
	collapsedGroupKeys = [],
	selectedTaskIds = [],
	...props
}: TaskBoardHarnessProps) {
	const groups = useMemo(
		() => sections ?? statusSectionFixture(props.tasks),
		[sections, props.tasks],
	)
	const flatItems = useMemo(
		() => buildTaskBoardFlatItems({ sections: groups, collapsedGroupKeys }),
		[groups, collapsedGroupKeys],
	)
	const eligibleKeys = useMemo(
		() => groups.flatMap((group) => group.tasks.map((task) => task.id)),
		[groups],
	)

	const boardCollection = useMemo(
		() => buildTaskBoardCollection({ eligibleKeys, flatItems }),
		[eligibleKeys, flatItems],
	)
	const collectionInteraction = useCollectionInteraction({
		projection: boardCollection.projection,
		defaultSelectedKeys: selectedTaskIds,
	})
	const taskById = useMemo(() => indexTasksById(props.tasks), [props.tasks])

	return (
		<>
			<TaskBoard
				{...props}
				boardCollection={boardCollection}
				collectionInteraction={collectionInteraction}
				flatItems={flatItems}
				focusIntent={focusIntent}
				onCollapseAll={onCollapseAll}
				onExpandAll={() => undefined}
				onFocusIntentConsumed={onFocusIntentConsumed}
				pagination={pagination}
				onRetry={onRetry}
				onSectionOpenChange={onSectionOpenChange}
				taskById={taskById}
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

/** renderer 夹具显式给定组顺序；真实分组规则由 Display/SQL 测试验证。 */
function statusSectionFixture(tasks: TaskListItem[]): TaskDisplaySection[] {
	return (['doing', 'waiting', 'todo', 'done', 'canceled'] satisfies TaskStatus[])
		.map((status) => {
			const members = tasks.filter((task) => task.status === status)
			return {
				key: `status:${status}`,
				label: formatTaskStatusLabel(status),
				status,
				tasks: members,
				totalCount: members.length,
			}
		})
		.filter((section) => section.tasks.length > 0)
}

function priorityStatusSectionFixture(tasks: TaskListItem[]): TaskDisplaySection[] {
	return [
		{ key: 'priority:4', label: '紧急', tasks: tasks.filter((task) => task.priority === 4) },
		{ key: 'priority:1', label: '低', tasks: tasks.filter((task) => task.priority === 1) },
	]
		.filter((parent) => parent.tasks.length > 0)
		.map((parent) => ({
			...parent,
			totalCount: parent.tasks.length,
			children: statusSectionFixture(parent.tasks).map((child) => ({
				...child,
				key: JSON.stringify([parent.key, child.key]),
			})),
		}))
}
