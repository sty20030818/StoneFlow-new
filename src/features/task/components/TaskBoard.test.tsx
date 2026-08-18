import { act, fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react'
import { useMemo, type ReactElement } from 'react'

import { BulkActionProvider } from '@/features/bulk-action'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { useCollectionInteraction, type CollectionFocusIntent } from '@/features/selection'
import { useDialogStore } from '@/features/shell-dialogs'
import { TaskBoard, type TaskBoardProps } from '@/features/task/components/TaskBoard'
import { focusTaskBoardTaskId } from '@/features/task/components/taskBoardScroll'
import {
	TASK_BOARD_HEADER_SIZE,
	TASK_BOARD_ROW_HEIGHT,
	TASK_BOARD_ROW_SIZE,
	buildTaskBoardFlatItems,
	type TaskBoardCustomSection,
} from '@/features/task/model/taskBoardModel'
import {
	TASK_BOARD_STATUS_ORDER,
	orderTasksByTaskBoardVisualOrder,
} from '@/features/task/model/taskBoardOrder'
import type { RowSelectionGroupPosition } from '@/shared/components/patterns/row-tokens'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

vi.mock('@/features/task/components/useTaskContextMenuBulkActions', () => ({
	useTaskContextMenuBulkActions: () => ({}),
}))

vi.mock('@/features/task/components/TaskRowAdapter', () => ({
	TaskRowAdapter: ({
		actions,
		gridCellProps,
		rowProps,
		rowRef,
		task,
		selectionGroupPosition,
		onContextMenuOpenChange,
	}: {
		actions: { onOpenTask: (taskId: string) => void }
		gridCellProps?: React.HTMLAttributes<HTMLDivElement>
		rowProps?: React.HTMLAttributes<HTMLDivElement>
		rowRef?: React.Ref<HTMLDivElement>
		task: TaskListItem
		selectionGroupPosition?: RowSelectionGroupPosition
		onContextMenuOpenChange?: (open: boolean) => void
	}) => {
		const ariaRowProps = rowProps ? { ...rowProps, onClick: undefined } : undefined
		return (
			<div
				{...ariaRowProps}
				ref={rowRef}
				aria-label={`打开任务 ${task.title}`}
				data-selection-group-position={selectionGroupPosition}
				onClick={() => actions.onOpenTask(task.id)}
				onContextMenu={() => onContextMenuOpenChange?.(true)}
			>
				<div {...gridCellProps}>
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
}))

describe('TaskBoard', () => {
	it('加载中不显示空态文案', () => {
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				emptyDescription='empty description'
				emptyTitle='暂无任务'
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='loading'
				tasks={[]}
			/>,
		)

		expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
		expect(screen.queryByText('empty description')).not.toBeInTheDocument()
	})

	it('显示状态分区 header，并用 totalCount 锁定总高', () => {
		const { container } = renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				hasNextPage
				loadedCount={1}
				tasks={[createTask({ id: 'task-1', title: '任务 A', status: 'todo' })]}
				totalCount={100}
			/>,
		)

		expect(screen.getByText('任务 A')).toBeInTheDocument()
		// scrollTop=0 且首个 header start=0 → stuck，浮层 + 原位（opacity:0）
		expect(screen.getAllByText('待执行').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByRole('button', { name: '折叠 待执行' }).length).toBeGreaterThanOrEqual(1)
		expect(
			screen.getAllByRole('button', { name: '在 待执行 中创建任务' }).length,
		).toBeGreaterThanOrEqual(1)
		expect(container.querySelector('[data-task-board-sticky-header]')).toBeTruthy()
		expect(container.querySelector('[data-board-section-header]')).toHaveClass('h-8')
		expect(container.querySelector('[data-board-root="true"]')).toHaveAttribute('tabindex', '0')
		expect(screen.getByRole('grid', { name: '任务列表' })).toHaveAttribute('aria-rowcount', '1')
		expect(container.querySelector('[data-board-root="true"]')?.className).toContain(
			'@container/task-list',
		)
		const root = container.querySelector('[data-task-board-virtual="sections"]')
		// 续拉中：flat(1 header + 1 行) + 未加载 99 行占位
		expect(root).toHaveAttribute('data-task-board-extent')
		const extent = Number(root?.getAttribute('data-task-board-extent'))
		expect(extent).toBe(TASK_BOARD_HEADER_SIZE + 100 * TASK_BOARD_ROW_SIZE)
		expect((root as HTMLElement).style.height).toBe(`${extent}px`)
	})

	it('customSections 显示分组标题', () => {
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				customSections={[
					{
						key: 'all',
						label: '全部任务',
						tasks: [createTask({ id: 'task-1', title: '任务 A' })],
					},
				]}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={[createTask({ id: 'task-1', title: '任务 A' })]}
				totalCount={1}
			/>,
		)

		expect(screen.getByText('任务 A')).toBeInTheDocument()
		expect(screen.getAllByText('全部任务').length).toBeGreaterThanOrEqual(1)
	})

	it('虚拟列表为连续选中行恢复分组位置和连续背景', () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
			createTask({ id: 'task-3', title: '任务 C' }),
			createTask({ id: 'task-4', title: '任务 D', status: 'doing' }),
		]
		const { container } = renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				customSections={[
					{ key: 'first', label: '第一组', tasks: tasks.slice(0, 3) },
					{ key: 'second', label: '第二组', tasks: tasks.slice(3) },
				]}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIds={tasks.map((task) => task.id)}
				status='ready'
				tasks={tasks}
				totalCount={tasks.length}
			/>,
		)

		expect(screen.getByRole('row', { name: '打开任务 任务 A' })).toHaveAttribute(
			'data-selection-group-position',
			'first',
		)
		expect(screen.getByRole('row', { name: '打开任务 任务 B' })).toHaveAttribute(
			'data-selection-group-position',
			'middle',
		)
		expect(screen.getByRole('row', { name: '打开任务 任务 C' })).toHaveAttribute(
			'data-selection-group-position',
			'last',
		)
		expect(screen.getByRole('row', { name: '打开任务 任务 D' })).toHaveAttribute(
			'data-selection-group-position',
			'single',
		)
		expect(container.querySelector('[data-task-board-selection-group="middle"]')).toHaveStyle({
			height: `${TASK_BOARD_ROW_SIZE}px`,
		})
		expect(container.querySelector('[data-task-board-selection-group="last"]')).toHaveStyle({
			height: `${TASK_BOARD_ROW_HEIGHT}px`,
		})
	})

	it('Grid 提供 row/gridcell，Arrow/Home/End 移动真实 DOM 焦点', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
			createTask({ id: 'task-3', title: '任务 C' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
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
		fireEvent.keyDown(rows[1]!, { key: 'End' })
		await waitFor(() => expect(rows[2]).toHaveFocus())
		fireEvent.keyDown(rows[2]!, { key: 'Home' })
		await waitFor(() => expect(rows[0]).toHaveFocus())
	})

	it('root capture 处理 J/K/Shift/X/Space/Enter/Cmd+A，并隔离行内控件', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
			createTask({ id: 'task-3', title: '任务 C' }),
		]
		const onOpenTask = vi.fn()
		const onPeekTask = vi.fn()
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				onEmptyAction={() => undefined}
				onOpenTask={onOpenTask}
				onPeekTask={onPeekTask}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={tasks}
			/>,
		)

		const rows = screen.getAllByRole('row')
		act(() => rows[0]?.focus())
		fireEvent.keyDown(rows[0]!, { key: 'j' })
		await waitFor(() => expect(rows[1]).toHaveFocus())
		fireEvent.keyDown(rows[1]!, { key: 'j', shiftKey: true })
		await waitFor(() => {
			expect(rows[1]).toHaveAttribute('aria-selected', 'true')
			expect(rows[2]).toHaveAttribute('aria-selected', 'true')
		})
		fireEvent.keyDown(rows[2]!, { key: 'x' })
		await waitFor(() => expect(rows[2]).toHaveAttribute('aria-selected', 'false'))
		fireEvent.keyDown(rows[2]!, { key: ' ' })
		expect(onPeekTask).toHaveBeenCalledWith('task-3', 'keyboard')
		fireEvent.keyDown(rows[2]!, { key: 'Enter' })
		expect(onOpenTask).toHaveBeenCalledWith('task-3')
		fireEvent.keyDown(rows[2]!, { key: 'a', metaKey: true })
		await waitFor(() => rows.forEach((row) => expect(row).toHaveAttribute('aria-selected', 'true')))
		fireEvent.keyDown(rows[2]!, { key: 'k' })
		await waitFor(() => expect(rows[1]).toHaveFocus())

		const inlineButton = within(rows[1]!).getByRole('button', { name: '行内操作 任务 B' })
		act(() => inlineButton.focus())
		fireEvent.keyDown(inlineButton, { key: 'j' })
		expect(inlineButton).toHaveFocus()
	})

	it('领域字符快捷键不被 Grid typeahead 抢占', async () => {
		useDialogStore.getState().closeCommand()
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={[
					createTask({ id: 'a-task', title: '任务 A' }),
					createTask({ id: 'd-task', title: '任务 D' }),
				]}
			/>,
		)

		const row = screen.getByRole('row', { name: '打开任务 任务 A' })
		act(() => row.focus())
		await waitFor(() => expect(screen.getByTestId('focused-key')).toHaveTextContent('a-task'))
		fireEvent.keyDown(row, { key: 'd' })

		await waitFor(() => {
			expect(row).toHaveFocus()
			expect(useDialogStore.getState().commandMenuMode).toBe('task-date-picker')
			expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['a-task'])
		})
		useDialogStore.getState().closeCommand()
	})

	it('右键保留已选集合，未选行切为单选，并在菜单关闭后恢复该行焦点', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A' }),
			createTask({ id: 'task-2', title: '任务 B' }),
			createTask({ id: 'task-3', title: '任务 C' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
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
			expect(screen.getByTestId('focused-key')).toHaveTextContent('task-2')
		})

		const closeMenuB = screen.getByRole('button', { name: '关闭模拟菜单 任务 B' })
		act(() => closeMenuB.focus())
		expect(closeMenuB).toHaveFocus()
		fireEvent.click(closeMenuB)
		await waitFor(() => expect(rowB).toHaveFocus())

		const rowC = screen.getByRole('row', { name: '打开任务 任务 C' })
		fireEvent.contextMenu(rowC)
		await waitFor(() => {
			expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-3')
			expect(screen.getByTestId('focused-key')).toHaveTextContent('task-3')
		})
	})

	it('focus intent 聚焦唯一可见 group trigger，J 再进入缓存的 row', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
			createTask({ id: 'task-2', title: '任务 B', status: 'doing' }),
		]
		const onFocusIntentConsumed = vi.fn()
		const focusIntent = {
			type: 'group-trigger',
			groupKey: 'h:todo',
			reentry: { type: 'item', key: 'task-2' },
		} satisfies CollectionFocusIntent<string, string>
		const { container } = renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				focusIntent={focusIntent}
				onEmptyAction={() => undefined}
				onFocusIntentConsumed={onFocusIntentConsumed}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={tasks}
			/>,
		)

		const trigger = screen.getByRole('button', { name: '折叠 待执行' })
		await waitFor(() => expect(trigger).toHaveFocus())
		expect(screen.getAllByRole('button', { name: '折叠 待执行' })).toHaveLength(1)
		expect(container.querySelector('[data-sticky="true"][aria-hidden="true"]')).toHaveAttribute(
			'inert',
		)
		expect(onFocusIntentConsumed).toHaveBeenCalledWith(focusIntent)

		fireEvent.keyDown(trigger, { key: 'j' })
		await waitFor(() => expect(screen.getByRole('row', { name: '打开任务 任务 B' })).toHaveFocus())
	})

	it('尾部 group 的 ArrowDown 再进入 collection root', async () => {
		const focusIntent = {
			type: 'group-trigger',
			groupKey: 'h:doing',
			reentry: { type: 'root' },
		} satisfies CollectionFocusIntent<string, string>
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				focusIntent={focusIntent}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={[
					createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
					createTask({ id: 'task-2', title: '任务 B', status: 'doing' }),
				]}
			/>,
		)

		const trigger = screen.getByRole('button', { name: '折叠 进行中' })
		const grid = screen.getByRole('grid', { name: '任务列表' })
		const rootFocus = vi.spyOn(grid, 'focus')
		await waitFor(() => expect(trigger).toHaveFocus())
		expect(fireEvent.keyDown(trigger, { key: 'ArrowDown' })).toBe(false)
		expect(rootFocus).toHaveBeenCalledWith({ preventScroll: true })
	})

	it('删除 fallback item intent 聚焦真实 row 并只消费一次', async () => {
		const focusIntent = {
			type: 'item',
			key: 'task-2',
		} satisfies CollectionFocusIntent<string, string>
		const onFocusIntentConsumed = vi.fn()
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				focusIntent={focusIntent}
				onEmptyAction={() => undefined}
				onFocusIntentConsumed={onFocusIntentConsumed}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={[
					createTask({ id: 'task-1', title: '任务 A' }),
					createTask({ id: 'task-2', title: '任务 B' }),
				]}
			/>,
		)

		await waitFor(() => expect(screen.getByRole('row', { name: '打开任务 任务 B' })).toHaveFocus())
		expect(onFocusIntentConsumed).toHaveBeenCalledTimes(1)
		expect(onFocusIntentConsumed).toHaveBeenCalledWith(focusIntent)
	})

	it('离屏 key 先驱动唯一 virtualizer 滚动，挂载后再聚焦真实 row', async () => {
		const tasks = Array.from({ length: 100 }, (_, index) =>
			createTask({ id: `task-${index}`, title: `任务 ${index}` }),
		)
		renderTaskBoard(
			<AppScrollArea viewportProps={{ 'data-testid': 'task-viewport' }}>
				<TaskBoardHarness
					activeTaskId={null}
					onEmptyAction={() => undefined}
					onOpenTask={() => undefined}
					onToggleTaskStatus={async () => undefined}
					onUpdateTaskPriority={async () => undefined}
					onUpdateTaskStatus={async () => undefined}
					pendingTaskId={null}
					status='ready'
					tasks={tasks}
				/>
			</AppScrollArea>,
		)

		const viewport = screen.getByTestId('task-viewport')
		const scrollTo = vi.fn((options: ScrollToOptions) => {
			viewport.scrollTop = options.top ?? 0
			viewport.dispatchEvent(new Event('scroll'))
		})
		Object.defineProperty(viewport, 'scrollTo', { configurable: true, value: scrollTo })

		act(() => focusTaskBoardTaskId('task-80'))

		await waitFor(() => expect(screen.getByRole('row', { name: '打开任务 任务 80' })).toHaveFocus())
		expect(scrollTo).toHaveBeenCalled()
	})

	it('分组全选一次更新 selection，不改动 focus 与 range anchor', async () => {
		const tasks = [
			createTask({ id: 'task-1', title: '任务 A', status: 'todo' }),
			createTask({ id: 'task-2', title: '任务 B', status: 'todo' }),
			createTask({ id: 'task-3', title: '任务 C', status: 'doing' }),
		]
		renderTaskBoard(
			<TaskBoardHarness
				activeTaskId={null}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				status='ready'
				tasks={tasks}
			/>,
		)

		const grid = screen.getByRole('grid', { name: '任务列表' })
		fireEvent.keyDown(grid, { key: 'j' })
		await waitFor(() => expect(screen.getByTestId('focused-key')).toHaveTextContent('task-3'))
		expect(screen.getByTestId('range-anchor-key')).toHaveTextContent('task-3')

		const visibleHeader = screen
			.getByRole('button', { name: '折叠 待执行' })
			.closest('[data-board-section-header]')
		fireEvent.contextMenu(visibleHeader!)
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
		expect(screen.getByTestId('range-anchor-key')).toHaveTextContent('task-3')
	})
})

function renderTaskBoard(element: ReactElement): RenderResult {
	return renderWithInteractionProviders(
		<DangerConfirmProvider>
			<BulkActionProvider actions={[]}>{element}</BulkActionProvider>
		</DangerConfirmProvider>,
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
	| 'onSectionOpenChange'
> & {
	customSections?: readonly TaskBoardCustomSection[]
	focusIntent?: CollectionFocusIntent<string, string> | null
	onFocusIntentConsumed?: (intent: CollectionFocusIntent<string, string>) => void
	openSections?: readonly TaskStatus[]
	selectedTaskIds?: readonly string[]
}

function TaskBoardHarness({
	customSections,
	focusIntent = null,
	onFocusIntentConsumed = () => undefined,
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
				onSectionOpenChange={() => undefined}
			/>
			<output data-testid='focused-key'>{collectionInteraction.focusedKey ?? 'none'}</output>
			<output data-testid='range-anchor-key'>
				{collectionInteraction.rangeAnchorKey ?? 'none'}
			</output>
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
