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

	it('customSections 只有 all 分组时按纯列表渲染，不显示分组标题', () => {
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
			/>,
		)

		expect(screen.getByText('任务 A')).toBeInTheDocument()
		expect(screen.queryByText('全部任务')).not.toBeInTheDocument()
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
		inboxAt: overrides.inboxAt ?? null,
		note: overrides.note ?? null,
		status: overrides.status ?? 'todo',
		statusChangedAt: overrides.statusChangedAt ?? '2026-06-28T10:00:00.000Z',
		priority: overrides.priority ?? 0,
		dueAt: overrides.dueAt ?? null,
		scheduledAt: overrides.scheduledAt ?? null,
		reminderAt: overrides.reminderAt ?? null,
		completedAt: overrides.completedAt ?? null,
		canceledAt: overrides.canceledAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-06-28T09:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-28T11:00:00.000Z',
	}
}
