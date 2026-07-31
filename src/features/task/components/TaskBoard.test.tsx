import { render, screen } from '@testing-library/react'

import { TaskBoard } from '@/features/task/components/TaskBoard'
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
	TaskRowAdapter: ({ task }: { task: TaskListItem }) => <div>{task.title}</div>,
}))

describe('TaskBoard', () => {
	it('加载中不显示空态文案', () => {
		render(
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
		const { container } = render(
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
		expect(container.querySelector('[data-task-board-sticky-header]')).toBeTruthy()
		const root = container.querySelector('[data-task-board-virtual="sections"]')
		// 续拉中：flat(1 header + 1 行) + 未加载 99 行占位
		expect(root).toHaveAttribute('data-task-board-extent')
		const extent = Number(root?.getAttribute('data-task-board-extent'))
		expect(extent).toBe(1 * 42 + 1 * 50 + 99 * 50)
		expect((root as HTMLElement).style.height).toBe(`${extent}px`)
	})

	it('customSections 显示分组标题', () => {
		render(
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
})

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
