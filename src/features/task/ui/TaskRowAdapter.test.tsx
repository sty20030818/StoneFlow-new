import { fireEvent, render, screen } from '@testing-library/react'

import { ROW_SHELL_ACTIVE_CLASS, ROW_SHELL_SELECTED_CLASS } from '@/shared/ui/row'
import type { TaskListItem } from '@/shared/types'
import { TaskRowAdapter, type TaskRowAdapterProps } from './TaskRowAdapter'

function buildTask(partial: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '个人',
		spaceSlug: 'personal',
		projectId: 'project-1',
		projectName: '项目 A',
		inboxAt: null,
		title: '任务 A',
		note: null,
		status: 'todo',
		statusChangedAt: '2026-05-07T08:00:00.000Z',
		priority: 1,
		dueAt: '2026-05-08T08:00:00.000Z',
		scheduledAt: '2026-05-09T08:00:00.000Z',
		reminderAt: '2026-05-07T09:00:00.000Z',
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-06T08:00:00.000Z',
		updatedAt: '2026-05-07T08:00:00.000Z',
		...partial,
	}
}

function buildActions(): TaskRowAdapterProps['actions'] {
	return {
		onOpenTask: vi.fn(),
		onToggleTaskSelection: vi.fn(),
		onUpdateTaskPriority: vi.fn().mockResolvedValue(undefined),
		onUpdateTaskStatus: vi.fn().mockResolvedValue(undefined),
		onToggleTaskStatus: vi.fn().mockResolvedValue(undefined),
		onArchiveTask: vi.fn().mockResolvedValue(undefined),
		onDeleteTask: vi.fn().mockResolvedValue(undefined),
	}
}

function renderTaskRowAdapter({
	task = buildTask(),
	rowState = { isActive: false, isSelected: false, isPending: false },
	projectBinding = {
		projectOptions: [
			{ id: 'project-1', name: '项目 A' },
			{ id: 'project-2', name: '项目 B' },
		],
		onSelectProject: vi.fn(),
		onSelectNoProject: vi.fn(),
	},
	actions = buildActions(),
}: {
	task?: TaskListItem
	rowState?: TaskRowAdapterProps['rowState']
	projectBinding?: TaskRowAdapterProps['projectBinding']
	actions?: TaskRowAdapterProps['actions']
} = {}) {
	render(
		<TaskRowAdapter
			actions={actions}
			projectBinding={projectBinding}
			rowState={rowState}
			task={task}
		/>,
	)
	return { task, rowState, projectBinding, actions }
}

describe('TaskRowAdapter', () => {
	it('行点击触发打开详情', () => {
		const { actions } = renderTaskRowAdapter()

		fireEvent.click(screen.getByRole('button', { name: '打开任务 任务 A' }))
		expect(actions.onOpenTask).toHaveBeenCalledWith('task-1')
	})

	it('选择框切换触发选择回调', () => {
		const { actions } = renderTaskRowAdapter()

		fireEvent.click(screen.getByRole('checkbox', { name: '选择任务 任务 A' }))
		expect(actions.onToggleTaskSelection).toHaveBeenCalledWith('task-1')
	})

	it('优先级和状态变更回调透传', async () => {
		const { actions, task } = renderTaskRowAdapter()

		fireEvent.pointerDown(screen.getByRole('button', { name: '设置任务 任务 A 的优先级' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /高/ }))
		expect(actions.onUpdateTaskPriority).toHaveBeenCalledWith(task, 3)

		fireEvent.pointerDown(screen.getByRole('button', { name: '设置任务 任务 A 的状态' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /已完成/ }))
		expect(actions.onUpdateTaskStatus).toHaveBeenCalledWith(task, 'done')
	})

	it('右键菜单动作触发任务动作回调', async () => {
		const { actions } = renderTaskRowAdapter()
		const row = screen.getByRole('button', { name: '打开任务 任务 A' })

		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: '标记完成' }))
		expect(actions.onToggleTaskStatus).toHaveBeenCalledTimes(1)

		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: '归档任务' }))
		expect(actions.onArchiveTask).toHaveBeenCalledTimes(1)

		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: '移入回收站' }))
		expect(actions.onDeleteTask).toHaveBeenCalledTimes(1)
	})

	it('active/selected/pending 映射到行壳状态 class', () => {
		const actions = buildActions()
		const task = buildTask()
		const projectBinding = {
			projectOptions: [{ id: 'project-1', name: '项目 A' }],
			onSelectProject: vi.fn(),
			onSelectNoProject: vi.fn(),
		}
		const { rerender } = render(
			<TaskRowAdapter
				actions={actions}
				projectBinding={projectBinding}
				rowState={{
					isActive: true,
					isSelected: true,
					isPending: true,
				}}
				task={task}
			/>,
		)

		const row = screen.getByRole('button', { name: '打开任务 任务 A' })
		expect(row.className).toContain(ROW_SHELL_ACTIVE_CLASS)
		expect(row.className).toContain('opacity-75')

		rerender(
			<TaskRowAdapter
				actions={actions}
				projectBinding={projectBinding}
				rowState={{
					isActive: false,
					isSelected: true,
					isPending: false,
				}}
				task={task}
			/>,
		)

		const selectedRow = screen.getByRole('button', { name: '打开任务 任务 A' })
		expect(selectedRow.className).toContain(ROW_SHELL_SELECTED_CLASS)
	})

	it('透传显式 selection group position 到真正的 surface', () => {
		render(
			<TaskRowAdapter
				actions={buildActions()}
				projectBinding={{
					projectOptions: [{ id: 'project-1', name: '项目 A' }],
					onSelectProject: vi.fn(),
					onSelectNoProject: vi.fn(),
				}}
				rowState={{
					isActive: false,
					isPending: false,
					isSelected: true,
				}}
				selectionGroupPosition='first'
				task={buildTask()}
			/>,
		)

		const row = screen.getByRole('button', { name: '打开任务 任务 A' })
		expect(row).toHaveAttribute('data-selection-group-position', 'first')
		expect(row.className).toContain('rounded-none')
		expect(row.className).toContain('rounded-t-md')
		expect(row.className).toContain('bg-transparent')
	})
})
