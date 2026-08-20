import { act, fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react'
import { useLayoutEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'

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
import { TaskBoard, type TaskBoardProps } from '@/features/task/components/TaskBoard'
import { focusTaskBoardTaskId } from '@/features/task/components/taskBoardScroll'
import {
	buildTaskBoardFlatItems,
	type TaskBoardCustomSection,
} from '@/features/task/model/taskBoardModel'
import {
	TASK_BOARD_STATUS_ORDER,
	orderTasksByTaskBoardVisualOrder,
} from '@/features/task/model/taskBoardOrder'
import type { RowSelectionGroupPosition } from '@/shared/components/row'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

vi.mock('@/features/task/components/useTaskContextMenuBulkActions', () => ({
	useTaskContextMenuBulkActions: () => ({}),
}))

vi.mock('@/features/task/components/TaskRowAdapter', () => ({
	TaskRowAdapter: ({
		gridCellProps,
		rowProps,
		rowRef,
		rowState,
		task,
		selectionGroupPosition,
		onContextMenuOpenChange,
	}: {
		gridCellProps?: React.HTMLAttributes<HTMLDivElement>
		rowProps?: React.HTMLAttributes<HTMLDivElement>
		rowRef?: React.Ref<HTMLDivElement>
		rowState: { suppressFocusIndicator?: boolean }
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
				data-suppress-focus-indicator={String(rowState.suppressFocusIndicator ?? false)}
				data-selection-group-position={selectionGroupPosition}
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
	it('离屏 key 先驱动唯一 virtualizer 滚动，挂载后再聚焦真实 row', async () => {
		const tasks = Array.from({ length: 100 }, (_, index) =>
			createTask({ id: `task-${index}`, title: `任务 ${index}` }),
		)
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
		const pendingScrolls: Promise<void>[] = []
		const scrollTo = vi.fn((options: ScrollToOptions) => {
			pendingScrolls.push(
				new Promise((resolve) => {
					window.setTimeout(() => {
						viewport.scrollTop = options.top ?? 0
						viewport.dispatchEvent(new Event('scroll'))
						resolve()
					}, 0)
				}),
			)
		})
		Object.defineProperty(viewport, 'scrollTo', { configurable: true, value: scrollTo })

		act(() => focusTaskBoardTaskId('task-80'))
		await act(async () => {
			await Promise.all(pendingScrolls)
		})

		await waitFor(() => expect(screen.getByRole('row', { name: '打开任务 任务 80' })).toHaveFocus())
		expect(scrollTo).toHaveBeenCalled()
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
