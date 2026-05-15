import { act, fireEvent, render, screen } from '@testing-library/react'

import type { TaskListItem } from '@/shared/types'

import { TaskRowShortcutScope } from './TaskRowShortcutScope'

describe('TaskRowShortcutScope', () => {
	beforeEach(() => {
		vi.useFakeTimers()
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

		expect(actions.onToggleTaskStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-a' }))
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
		expect(actions.onDeleteTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'task-a' }))
		expect(actions.onDeleteTask).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'task-a' }))
	})

	it('P / S 打开目标行已有优先级和状态菜单', () => {
		const actions = createActions()
		renderScope({ actions })

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		fireKey('p')
		fireKey('s')
		flushShortcutTimers()

		expect(screen.getByTestId('priority-trigger-task-a')).toHaveAttribute('data-clicked', 'true')
		expect(screen.getByTestId('status-trigger-task-a')).toHaveAttribute('data-clicked', 'true')
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
	const tasks = [createTask({ id: 'task-a', title: '任务 A' }), createTask({ id: 'task-b', title: '任务 B' })]

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
								<button
									data-task-row-menu-trigger='priority'
									data-testid={`priority-trigger-${task.id}`}
									onClick={(event) => {
										event.currentTarget.setAttribute('data-clicked', 'true')
									}}
									type='button'
								/>
								<button
									data-task-row-menu-trigger='status'
									data-testid={`status-trigger-${task.id}`}
									onClick={(event) => {
										event.currentTarget.setAttribute('data-clicked', 'true')
									}}
									type='button'
								/>
							</div>
						))}
					</div>
				)}
			</TaskRowShortcutScope>
		</>,
	)

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
