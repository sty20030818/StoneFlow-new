import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import { ROW_SHELL_ACTIVE_CLASS, ROW_SHELL_SELECTED_CLASS } from '@/shared/components/row'
import { TooltipProvider } from '@/shared/components/base/tooltip'
import type { TaskListItem } from '@/shared/types'

import { TaskRowAdapter, type TaskRowAdapterProps } from './TaskRowAdapter'
import type { TaskContextMenuBulkActions } from './useTaskContextMenuBulkActions'
import { TASK_ROW_SHORTCUT_BINDINGS } from '../shortcuts'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...TASK_ROW_SHORTCUT_BINDINGS,
])

function buildTask(partial: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '个人',
		spaceSlug: 'personal',
		projectId: 'project-1',
		projectName: '项目 A',
		title: '任务 A',
		status: 'todo',
		statusChangedAt: '2026-05-07T08:00:00.000Z',
		priority: 1,
		dueAt: '2026-05-08T08:00:00.000Z',
		plannedAt: '2026-05-09T08:00:00.000Z',
		remindAt: '2026-05-07T09:00:00.000Z',
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
		onUpdateTaskDueDate: vi.fn().mockResolvedValue(undefined),
		onUpdateTaskScheduledAt: vi.fn().mockResolvedValue(undefined),
		onUpdateTaskReminderAt: vi.fn().mockResolvedValue(undefined),
		onToggleTaskStatus: vi.fn().mockResolvedValue(undefined),
		onArchiveTask: vi.fn().mockResolvedValue(undefined),
		onDeleteTask: vi.fn().mockResolvedValue(undefined),
	}
}

function createProjectBinding(
	overrides: Partial<NonNullable<TaskRowAdapterProps['projectBinding']>> = {},
) {
	return {
		projectOptions: [
			{ id: 'project-1', name: '项目 A', spaceId: 'space-1' },
			{ id: 'project-2', name: '项目 B', spaceId: 'space-1' },
			{ id: 'project-3', name: '项目 C', spaceId: 'space-2' },
		],
		spaces: [
			{ id: 'space-1', name: '个人', iconKey: 'user', colorKey: 'blue' },
			{ id: 'space-2', name: '工作', iconKey: 'briefcase', colorKey: 'green' },
		],
		onSelectPlacement: vi.fn(),
		showProjectCellOptions: true,
		...overrides,
	}
}

function renderTaskRowAdapter({
	task = buildTask(),
	rowState = { isActive: false, isSelected: false, isPending: false },
	projectBinding = createProjectBinding(),
	actions = buildActions(),
	contextMenuActions,
	contextTasks,
	visibleProperties,
	showSpaceLabel = false,
}: {
	task?: TaskListItem
	rowState?: TaskRowAdapterProps['rowState']
	projectBinding?: TaskRowAdapterProps['projectBinding']
	actions?: TaskRowAdapterProps['actions']
	contextMenuActions?: TaskContextMenuBulkActions
	contextTasks?: TaskListItem[]
	visibleProperties?: TaskRowAdapterProps['visibleProperties']
	showSpaceLabel?: boolean
} = {}) {
	render(
		<TestProviders>
			<TaskRowAdapter
				actions={actions}
				contextMenuActions={contextMenuActions}
				contextTasks={contextTasks}
				projectBinding={projectBinding}
				rowState={rowState}
				showSpaceLabel={showSpaceLabel}
				task={task}
				visibleProperties={visibleProperties}
			/>
		</TestProviders>,
	)

	return { task, rowState, projectBinding, actions }
}

describe('TaskRowAdapter', () => {
	it('行点击触发打开详情', () => {
		const { actions } = renderTaskRowAdapter()

		fireEvent.click(screen.getByRole('button', { name: '打开任务 任务 A' }))
		expect(actions.onOpenTask).toHaveBeenCalledWith('task-1')
	})

	it('showSpaceLabel 时固定展示 Space 名与真实彩色 icon', () => {
		renderTaskRowAdapter({
			showSpaceLabel: true,
			task: buildTask({
				spaceId: 'space-2',
				spaceName: '工作',
				title: '跨空间任务',
			}),
		})

		expect(screen.getByText('工作')).toBeInTheDocument()
		expect(screen.getByText('跨空间任务')).toBeInTheDocument()
		const spaceValue = screen.getByLabelText('所属空间 工作')
		expect(spaceValue.tagName).toBe('SPAN')
		const icon = spaceValue.querySelector('svg')
		// briefcase + green token（来自 space-2 的 iconKey/colorKey）
		expect(icon).toBeTruthy()
		expect(icon?.getAttribute('class') ?? '').toContain('text-[#2da44e]')
	})

	it('默认不展示行内 Space 次要标签', () => {
		renderTaskRowAdapter({
			showSpaceLabel: false,
			task: buildTask({
				spaceName: '独有空间名XYZ',
				projectId: null,
				projectName: null,
				title: '本空间任务',
			}),
			projectBinding: createProjectBinding({ showProjectCellOptions: false }),
		})

		expect(screen.getByText('本空间任务')).toBeInTheDocument()
		expect(screen.queryByText('独有空间名XYZ')).not.toBeInTheDocument()
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

	it('任务行字段 Tooltip 只从 row Registry 展示真实快捷键', async () => {
		renderTaskRowAdapter()

		fireEvent.focus(screen.getByRole('button', { name: '设置任务 任务 A 的优先级' }))

		expect(await screen.findByRole('tooltip')).toHaveTextContent('设置任务 任务 A 的优先级P')
		expect(screen.getByLabelText('按 P')).toBeInTheDocument()
	})

	it('归属字段使用 local grouped placement，并暴露 standalone / project', async () => {
		const { projectBinding, task } = renderTaskRowAdapter()

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		await screen.findByRole('menu')

		expect(screen.getByText('个人')).toBeInTheDocument()
		expect(screen.queryByText('工作')).not.toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /独立事项/ })).toBeInTheDocument()
		expect(screen.queryByRole('menuitem', { name: /项目 C/ })).not.toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual(['0'])

		fireEvent.click(screen.getByRole('menuitem', { name: /独立事项/ }))
		expect(projectBinding?.onSelectPlacement).toHaveBeenCalledWith(task, {
			kind: 'standalone',
			spaceId: 'space-1',
		} satisfies TaskPlacementTarget)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))
		expect(projectBinding?.onSelectPlacement).toHaveBeenCalledWith(task, {
			kind: 'project',
			spaceId: 'space-1',
			projectId: 'project-2',
		} satisfies TaskPlacementTarget)
	})

	it('showProjectCellOptions=false 时不渲染归属 dropdown', () => {
		renderTaskRowAdapter({
			projectBinding: createProjectBinding({
				showProjectCellOptions: false,
			}),
		})

		expect(screen.queryByRole('button', { name: '归属' })).not.toBeInTheDocument()
	})

	it('visibleProperties 会控制行内字段显示', () => {
		renderTaskRowAdapter({
			visibleProperties: ['status', 'project', 'updatedAt'],
		})

		expect(
			screen.queryByRole('button', { name: '设置任务 任务 A 的优先级' }),
		).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '设置任务 任务 A 的状态' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '归属' })).toBeInTheDocument()
		expect(screen.getByText('5/7')).toBeInTheDocument()
		expect(screen.queryByText('5/6')).not.toBeInTheDocument()
		expect(screen.queryByText('5/8')).not.toBeInTheDocument()
	})

	it('右键菜单属性动作在多选时统一走 placement bulk 入口', async () => {
		const task = buildTask()
		const contextTasks = [task, buildTask({ id: 'task-2', title: '任务 B', projectId: null })]
		const contextMenuActions = buildContextMenuActions()
		const projectBinding = createProjectBinding()

		renderTaskRowAdapter({
			contextMenuActions,
			contextTasks,
			projectBinding,
			task,
		})

		fireEvent.contextMenu(screen.getByRole('button', { name: '打开任务 任务 A' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /归属/ }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /独立事项/ }))
		expect(contextMenuActions.onSelectPlacement).toHaveBeenCalledWith(contextTasks, {
			kind: 'standalone',
			spaceId: 'space-1',
		})
		expect(projectBinding.onSelectPlacement).not.toHaveBeenCalled()

		fireEvent.contextMenu(screen.getByRole('button', { name: '打开任务 任务 A' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /归属/ }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))
		expect(contextMenuActions.onSelectPlacement).toHaveBeenCalledWith(contextTasks, {
			kind: 'project',
			spaceId: 'space-1',
			projectId: 'project-2',
		})
	})

	it('active/selected/pending 映射到行壳状态 class', () => {
		const task = buildTask()
		const actions = buildActions()
		const { rerender } = render(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isActive: true,
						isSelected: true,
						isPending: true,
					}}
					task={task}
				/>
			</TestProviders>,
		)

		const row = screen.getByRole('button', { name: '打开任务 任务 A' })
		expect(row.className).toContain(ROW_SHELL_ACTIVE_CLASS)
		expect(row.className).toContain('opacity-75')

		rerender(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isActive: false,
						isSelected: true,
						isPending: false,
					}}
					task={task}
				/>
			</TestProviders>,
		)

		const selectedRow = screen.getByRole('button', { name: '打开任务 任务 A' })
		expect(selectedRow.className).toContain(ROW_SHELL_SELECTED_CLASS)
		expect(screen.getByRole('checkbox', { name: '选择任务 任务 A' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
	})

	it('右键菜单危险动作触发任务动作回调', async () => {
		const { actions } = renderTaskRowAdapter()
		const row = screen.getByRole('button', { name: '打开任务 任务 A' })

		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: /归档任务/ }))
		await screen.findByRole('alertdialog')
		fireEvent.click(screen.getByRole('button', { name: '归档' }))
		await waitFor(() => {
			expect(actions.onArchiveTask).toHaveBeenCalledTimes(1)
		})
	})
})

function TestProviders({ children }: { children: React.ReactNode }) {
	return (
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<TooltipProvider delayDuration={0}>
				<DangerConfirmProvider>{children}</DangerConfirmProvider>
			</TooltipProvider>
		</ShortcutRegistryProvider>
	)
}

function buildContextMenuActions(): TaskContextMenuBulkActions {
	return {
		onArchive: vi.fn(),
		onMoveToTrash: vi.fn(),
		onSelectDueDate: vi.fn(),
		onSelectPlacement: vi.fn(),
		onSelectPriority: vi.fn(),
		onSelectStatus: vi.fn(),
	}
}

function getShortcutHintDigits() {
	return [...document.querySelectorAll('[data-slot="shortcut-menu-item-hint"]')].map(
		(item) => item.textContent,
	)
}
