import { render, screen, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

import { TaskBoard } from '@/features/task/components/TaskBoard'
import type { RowSelectionGroupPosition } from '@/shared/components/patterns/row-tokens'
import { TooltipProvider } from '@/shared/components/base/tooltip'
import type { TaskListItem } from '@/shared/types'

vi.mock('@/features/task/components/useTaskContextMenuBulkActions', () => ({
	useTaskContextMenuBulkActions: () => ({}),
}))

vi.mock('@/features/task/shortcuts', () => ({
	TaskRowShortcutScope: ({
		children,
	}: {
		children: (state: {
			hoveredId: string | null
			hoverSource: 'pointer' | 'keyboard' | null
			onRowHover: (taskId: string | null) => void
			onRowPointerMove: (taskId: string, point: { x: number; y: number }) => void
		}) => React.ReactNode
	}) =>
		children({
			hoveredId: null,
			hoverSource: null,
			onRowHover: () => undefined,
			onRowPointerMove: () => undefined,
		}),
}))

vi.mock('@/features/task/components/TaskRowAdapter', () => ({
	TaskRowAdapter: ({
		task,
		selectionGroupPosition,
	}: {
		task: TaskListItem
		selectionGroupPosition?: RowSelectionGroupPosition
	}) => <div data-selection-group-position={selectionGroupPosition}>{task.title}</div>,
}))

describe('TaskBoard', () => {
	it('加载中不显示空态文案', () => {
		renderTaskBoard(
			<TaskBoard
				activeTaskId={null}
				emptyDescription='empty description'
				emptyTitle='暂无任务'
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskSelection={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIdSet={new Set()}
				status='loading'
				tasks={[]}
			/>,
		)

		expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
		expect(screen.queryByText('empty description')).not.toBeInTheDocument()
	})

	it('显示状态分区 header，并用 totalCount 锁定总高', () => {
		const { container } = renderTaskBoard(
			<TaskBoard
				activeTaskId={null}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskSelection={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIdSet={new Set()}
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
		expect(container.querySelector('[data-board-root="true"]')).toHaveAttribute('tabindex', '-1')
		const root = container.querySelector('[data-task-board-virtual="sections"]')
		// 续拉中：flat(1 header + 1 行) + 未加载 99 行占位
		expect(root).toHaveAttribute('data-task-board-extent')
		const extent = Number(root?.getAttribute('data-task-board-extent'))
		expect(extent).toBe(1 * 42 + 1 * 50 + 99 * 50)
		expect((root as HTMLElement).style.height).toBe(`${extent}px`)
	})

	it('customSections 显示分组标题', () => {
		renderTaskBoard(
			<TaskBoard
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
				onToggleTaskSelection={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIdSet={new Set()}
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
			<TaskBoard
				activeTaskId={null}
				customSections={[
					{ key: 'first', label: '第一组', tasks: tasks.slice(0, 3) },
					{ key: 'second', label: '第二组', tasks: tasks.slice(3) },
				]}
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskSelection={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIdSet={new Set(tasks.map((task) => task.id))}
				status='ready'
				tasks={tasks}
				totalCount={tasks.length}
			/>,
		)

		expect(screen.getByText('任务 A')).toHaveAttribute('data-selection-group-position', 'first')
		expect(screen.getByText('任务 B')).toHaveAttribute('data-selection-group-position', 'middle')
		expect(screen.getByText('任务 C')).toHaveAttribute('data-selection-group-position', 'last')
		expect(screen.getByText('任务 D')).toHaveAttribute('data-selection-group-position', 'single')
		expect(container.querySelector('[data-task-board-selection-group="middle"]')).toHaveStyle({
			height: '50px',
		})
		expect(container.querySelector('[data-task-board-selection-group="last"]')).toHaveStyle({
			height: '48px',
		})
	})
})

function renderTaskBoard(element: ReactElement): RenderResult {
	return render(<TooltipProvider>{element}</TooltipProvider>)
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
