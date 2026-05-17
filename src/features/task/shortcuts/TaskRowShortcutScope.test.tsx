import { act, fireEvent, render, screen } from '@testing-library/react'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'

import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import type { TaskListItem } from '@/shared/types'

import { TaskRowShortcutScope } from './TaskRowShortcutScope'

describe('TaskRowShortcutScope', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		useDialogStore.setState({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
		})
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('hover 行时 W 触发完成，X 触发选择', () => {
		const actions = createActions()
		renderScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		fireKey('w')
		fireKey('x')
		flushShortcutTimers()

		expect(actions.onToggleTaskStatus).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'task-a' }),
		)
		expect(actions.onToggleTaskSelection).toHaveBeenCalledWith('task-a')
	})

	it('Space / Enter 打开目标任务', () => {
		const actions = createActions()
		renderScope({ actions })

		fireEvent.focus(screen.getByTestId('row-task-a'))
		fireKey(' ')
		fireKey('Enter')
		flushShortcutTimers()

		expect(actions.onOpenTask).toHaveBeenNthCalledWith(1, 'task-a')
		expect(actions.onOpenTask).toHaveBeenNthCalledWith(2, 'task-a')
	})

	it('A / Delete / Cmd+Backspace 执行归档和删除', () => {
		const actions = createActions()
		renderScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		fireKey('a')
		fireKey('Delete')
		fireKey('Backspace', { metaKey: true })
		flushShortcutTimers()

		expect(actions.onArchiveTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-a' }))
		expect(actions.onDeleteTask).toHaveBeenCalledTimes(2)
		expect(actions.onDeleteTask).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ id: 'task-a' }),
		)
		expect(actions.onDeleteTask).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ id: 'task-a' }),
		)
	})

	it('P / S / D 打开目标行的 Command scoped picker', () => {
		const actions = createActions()
		renderScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		fireKey('p')
		flushShortcutTimers()
		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-priority-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])

		useDialogStore.getState().closeCommand()
		fireKey('s')
		flushShortcutTimers()
		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-status-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])

		useDialogStore.getState().closeCommand()
		fireKey('d')
		flushShortcutTimers()
		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-date-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])
	})

	it('输入态和上层菜单打开时不触发', () => {
		const actions = createActions()
		renderScope({ actions, withBlockingLayer: true })

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		fireKey('w')
		fireKey('x', { target: screen.getByLabelText('编辑标题') })
		flushShortcutTimers()

		expect(actions.onToggleTaskStatus).not.toHaveBeenCalled()
		expect(actions.onToggleTaskSelection).not.toHaveBeenCalled()
	})

	it('多选时 W / A / Delete 批量执行，Space / Enter 不执行', () => {
		const actions = createActions()
		renderScope({
			actions,
			selectedTaskIds: ['task-a', 'task-b'],
		})

		fireEvent.focus(screen.getByTestId('row-task-a'))
		fireKey('w')
		fireKey('a')
		fireKey('Delete')
		fireKey(' ')
		fireKey('Enter')
		flushShortcutTimers()

		expect(actions.onToggleTaskStatus).toHaveBeenCalledTimes(2)
		expect(actions.onArchiveTask).toHaveBeenCalledTimes(2)
		expect(actions.onDeleteTask).toHaveBeenCalledTimes(2)
		expect(actions.onOpenTask).not.toHaveBeenCalled()
	})

	it('多选时 P 使用 selection 作为 scoped picker 上下文', () => {
		const actions = createActions()
		renderScope({
			actions,
			selectedTaskIds: ['task-a', 'task-b'],
		})

		fireEvent.focus(screen.getByTestId('row-task-a'))
		fireKey('p')
		flushShortcutTimers()

		expect(useDialogStore.getState().commandMenuMode).toBe('task-priority-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a', 'task-b'])
	})

	it('ArrowDown / ArrowUp 只移动 keyboard focus，不改变 selection', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')

		fireKey('ArrowDown')
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowDown')
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-c')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowUp')
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})

	it('方向键优先从 hover 行开始移动 keyboard focus', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-b'))
		fireKey('ArrowDown')

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-c')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowUp')

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})

	it('Shift+ArrowDown / Shift+ArrowUp 会逐行切换选中状态', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a')

		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a,task-b')

		fireKey('ArrowUp', { shiftKey: true })
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a')

		fireKey('ArrowUp', { shiftKey: true })
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})

	it('Shift+Arrow 从 hover 行开始时，先切换 hover 行再移动切换', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-b'))
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b')

		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-c')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b,task-c')
	})

	it('Shift+Arrow 在已选中行上会取消该行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireKey('ArrowDown', { shiftKey: true })
		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a,task-b')

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b')
	})

	it('部分选区从下边界反向时先取消下边界', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-c'))
		fireKey('ArrowDown', { shiftKey: true })
		fireKey('ArrowDown', { shiftKey: true })
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-e')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d,task-e')

		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-e')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d')
	})

	it('部分选区从上边界反向时先取消上边界', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-d'))
		fireKey('ArrowUp', { shiftKey: true })
		fireKey('ArrowUp', { shiftKey: true })
		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b,task-c,task-d')

		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d')
	})

	it('全选后 Shift+Arrow 先取消当前边界行，再继续取消下一行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowDown', { shiftKey: true })
		}

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-f')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent(
			'task-a,task-b,task-c,task-d,task-e,task-f',
		)

		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-f')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent(
			'task-a,task-b,task-c,task-d,task-e',
		)

		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-e')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a,task-b,task-c,task-d')
	})

	it('全选后 hover 到第一行时 Shift+Arrow 先取消第一行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowDown', { shiftKey: true })
		}

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent(
			'task-b,task-c,task-d,task-e,task-f',
		)

		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d,task-e,task-f')
	})

	it('Shift+Arrow 取消到空选后再次开始时先切当前行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowDown', { shiftKey: true })
		}

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowUp', { shiftKey: true })
		}

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a')
	})

	it('上层菜单打开时 Arrow 和 Shift+Arrow 不触发范围选择', () => {
		const actions = createActions()
		renderSelectionScope({ actions, withBlockingLayer: true })

		fireKey('ArrowDown')
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})
})

function renderScope({
	actions = createActions(),
	selectedTaskIds = [],
	withBlockingLayer = false,
}: {
	actions?: ReturnType<typeof createActions>
	selectedTaskIds?: string[]
	withBlockingLayer?: boolean
} = {}) {
	const tasks = [
		createTask({ id: 'task-a', title: '任务 A' }),
		createTask({ id: 'task-b', title: '任务 B' }),
	]

	render(
		<>
			{withBlockingLayer ? <div data-slot='dropdown-menu-content' /> : null}
			<input aria-label='编辑标题' />
			<TaskRowShortcutScope
				activeTaskId={null}
				onArchiveTask={actions.onArchiveTask}
				onDeleteTask={actions.onDeleteTask}
				onOpenTask={actions.onOpenTask}
				onToggleTaskSelection={actions.onToggleTaskSelection}
				onToggleTaskStatus={actions.onToggleTaskStatus}
				selectedTaskIdSet={new Set(selectedTaskIds)}
				tasks={tasks}
			>
				{(state) => (
					<div>
						{tasks.map((task) => (
							<div
								data-task-id={task.id}
								data-testid={`row-${task.id}`}
								key={task.id}
								onFocus={() => state.onRowFocus(task.id)}
								onMouseEnter={() => state.onRowHover(task.id)}
								tabIndex={0}
							>
							</div>
						))}
					</div>
				)}
			</TaskRowShortcutScope>
		</>,
	)

	return actions
}

function renderSelectionScope({
	actions = createActions(),
	withBlockingLayer = false,
}: {
	actions?: ReturnType<typeof createActions>
	withBlockingLayer?: boolean
} = {}) {
	const tasks = [
		createTask({ id: 'task-a', title: '任务 A' }),
		createTask({ id: 'task-b', title: '任务 B' }),
		createTask({ id: 'task-c', title: '任务 C' }),
		createTask({ id: 'task-d', title: '任务 D' }),
		createTask({ id: 'task-e', title: '任务 E' }),
		createTask({ id: 'task-f', title: '任务 F' }),
	]

	function SelectionHarness() {
		const {
			selectedTaskIds,
			selectedTaskIdSet,
			selectedCount,
			focusedTaskId,
			setFocusedTaskId,
			moveFocus,
			toggleTaskSelection,
		} = useTaskSelection(tasks.map((task) => task.id))

		return (
			<>
				{withBlockingLayer ? <div data-slot='dropdown-menu-content' /> : null}
				<div data-testid='focused-task'>{focusedTaskId ?? 'none'}</div>
				<div data-testid='selected-count'>{selectedCount}</div>
				<div data-testid='selected-ids'>{selectedTaskIds.join(',')}</div>
				<TaskRowShortcutScope
					activeTaskId={null}
					focusedTaskId={focusedTaskId}
					onArchiveTask={actions.onArchiveTask}
					onDeleteTask={actions.onDeleteTask}
					onMoveTaskFocus={moveFocus}
					onOpenTask={actions.onOpenTask}
					onSetFocusedTask={setFocusedTaskId}
					onToggleTaskSelection={toggleTaskSelection}
					onToggleTaskStatus={actions.onToggleTaskStatus}
					selectedTaskIdSet={selectedTaskIdSet}
					tasks={tasks}
				>
					{(state) => (
						<div>
							{tasks.map((task) => (
								<div
									data-task-id={task.id}
									data-testid={`row-${task.id}`}
									key={task.id}
									onFocus={() => state.onRowFocus(task.id)}
									onMouseEnter={() => state.onRowHover(task.id)}
									tabIndex={0}
								/>
							))}
						</div>
					)}
				</TaskRowShortcutScope>
			</>
		)
	}

	render(<SelectionHarness />)
	return actions
}

function createActions() {
	return {
		onToggleTaskSelection: vi.fn(),
		onToggleTaskStatus: vi.fn().mockResolvedValue(undefined),
		onArchiveTask: vi.fn().mockResolvedValue(undefined),
		onDeleteTask: vi.fn().mockResolvedValue(undefined),
		onOpenTask: vi.fn(),
	}
}

function createTask(overrides: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 'task-a',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		inboxAt: '2026-05-15T00:00:00Z',
		title: '任务 A',
		note: null,
		status: 'todo',
		statusChangedAt: '2026-05-15T00:00:00Z',
		priority: 2,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
		...overrides,
	}
}

function fireKey(
	key: string,
	options: Pick<KeyboardEventInit, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> & {
		target?: EventTarget
	} = {},
) {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		metaKey: options.metaKey,
		ctrlKey: options.ctrlKey,
		altKey: options.altKey,
		shiftKey: options.shiftKey,
	})

	Object.defineProperty(event, 'target', {
		configurable: true,
		value: options.target ?? document.body,
	})

	act(() => {
		window.dispatchEvent(event)
	})
}

function flushShortcutTimers() {
	act(() => {
		vi.runAllTimers()
	})
}
