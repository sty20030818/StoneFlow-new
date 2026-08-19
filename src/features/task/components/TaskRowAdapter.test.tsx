import { fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'

import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
	createEmptyCommandContext,
	type Command,
	type CommandContext,
	type CommandInvocation,
} from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskListItem } from '@/shared/types'

import { TASK_ROW_SHORTCUT_BINDINGS } from '../shortcuts'
import { TaskRowAdapter, type TaskRowAdapterProps } from './TaskRowAdapter'
import type { TaskContextMenuBulkActions } from './useTaskContextMenuBulkActions'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...TASK_ROW_SHORTCUT_BINDINGS,
])

describe('TaskRowAdapter', () => {
	it('把 React Aria row/gridcell/ref 翻译为唯一的行打开命令', () => {
		const onCommand = vi.fn()
		const reactAriaPressClick = vi.fn()
		const rowRef = createRef<HTMLDivElement>()
		const { actions } = renderTaskRowAdapter({
			onCommand,
			rowRef,
			rowProps: {
				role: 'row',
				tabIndex: 0,
				'aria-selected': false,
				onClick: reactAriaPressClick,
			},
			gridCellProps: { role: 'gridcell' },
		})

		const row = screen.getByRole('row', { name: '打开任务 任务 A' })
		expect(rowRef.current).toBe(row)
		expect(within(row).getByRole('gridcell')).toBeInTheDocument()
		fireEvent.click(row)

		expect(onCommand).toHaveBeenCalledWith(
			COMMAND_IDS.taskOpenDetail,
			expect.objectContaining({ selection: expect.objectContaining({ ids: ['task-1'] }) }),
			{ source: 'row' },
		)
		expect(actions.onToggleTaskSelection).not.toHaveBeenCalled()
		expect(reactAriaPressClick).not.toHaveBeenCalled()
	})

	it('选择框只更新 selection，不触发行打开', () => {
		const onCommand = vi.fn()
		const { actions } = renderTaskRowAdapter({ onCommand })

		fireEvent.click(screen.getByRole('checkbox', { name: '选择任务：任务 A' }))

		expect(actions.onToggleTaskSelection).toHaveBeenCalledWith('task-1')
		expect(onCommand).not.toHaveBeenCalled()
	})

	it('只呈现调用方声明的字段，并在 All scope 露出真实 Space', () => {
		renderTaskRowAdapter({
			showSpaceLabel: true,
			visibleProperties: ['status', 'updatedAt'],
			task: buildTask({ spaceId: 'space-2', spaceName: '工作', title: '跨空间任务' }),
		})

		expect(screen.getByLabelText('所属空间 工作')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '修改状态：跨空间任务' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '修改优先级：跨空间任务' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '归属' })).not.toBeInTheDocument()
		expect(screen.getByText('5/7')).toBeInTheDocument()
	})

	it('把一个 metadata 字段和归属选择映射回任务动作', async () => {
		const { actions, projectBinding, task } = renderTaskRowAdapter()

		fireEvent.pointerDown(screen.getByRole('button', { name: '修改优先级：任务 A' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /高/ }))
		expect(actions.onUpdateTaskPriority).toHaveBeenCalledWith(task, 3)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))
		expect(projectBinding?.onSelectPlacement).toHaveBeenCalledWith(task, {
			kind: 'project',
			spaceId: 'space-1',
			projectId: 'project-2',
		} satisfies TaskPlacementTarget)
	})

	it('多选右键属性动作只走 bulk snapshot，不回落到单行 binding', async () => {
		const task = buildTask()
		const contextTasks = [task, buildTask({ id: 'task-2', title: '任务 B', projectId: null })]
		const contextMenuActions = buildContextMenuActions()
		const projectBinding = createProjectBinding()
		renderTaskRowAdapter({ contextMenuActions, contextTasks, projectBinding, task })

		fireEvent.contextMenu(screen.getByLabelText('打开任务 任务 A'))
		fireEvent.click(await screen.findByRole('menuitem', { name: /移动到/ }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /独立事项/ }))

		expect(contextMenuActions.onSelectPlacement).toHaveBeenCalledWith(contextTasks, {
			kind: 'standalone',
			spaceId: 'space-1',
		})
		expect(projectBinding.onSelectPlacement).not.toHaveBeenCalled()
	})

	it('右键危险动作投影稳定目标与 context-menu 来源', async () => {
		const onCommand = vi.fn()
		renderTaskRowAdapter({ onCommand })

		fireEvent.contextMenu(screen.getByLabelText('打开任务 任务 A'))
		fireEvent.click(await screen.findByRole('menuitem', { name: /归档任务/ }))

		expect(onCommand).toHaveBeenCalledWith(
			COMMAND_IDS.taskArchive,
			expect.objectContaining({
				selection: expect.objectContaining({ ids: ['task-1'] }),
				rowTarget: expect.objectContaining({ source: 'context-menu', targetId: 'task-1' }),
			}),
			{ source: 'context-menu' },
		)
	})
})

function renderTaskRowAdapter({
	task = buildTask(),
	rowState = { isSelected: false, isPending: false, isFocused: false, focusSource: null },
	projectBinding = createProjectBinding(),
	actions = buildActions(),
	contextMenuActions,
	contextTasks,
	visibleProperties,
	showSpaceLabel = false,
	rowProps,
	gridCellProps,
	rowRef,
	onCommand,
}: {
	task?: TaskListItem
	rowState?: TaskRowAdapterProps['rowState']
	projectBinding?: TaskRowAdapterProps['projectBinding']
	actions?: TaskRowAdapterProps['actions']
	contextMenuActions?: TaskContextMenuBulkActions
	contextTasks?: TaskListItem[]
	visibleProperties?: TaskRowAdapterProps['visibleProperties']
	showSpaceLabel?: boolean
	rowProps?: TaskRowAdapterProps['rowProps']
	gridCellProps?: TaskRowAdapterProps['gridCellProps']
	rowRef?: TaskRowAdapterProps['rowRef']
	onCommand?: (commandId: string, context: CommandContext, invocation: CommandInvocation) => void
} = {}) {
	render(
		<TestProviders onCommand={onCommand}>
			<TaskRowAdapter
				actions={actions}
				contextMenuActions={contextMenuActions}
				contextTasks={contextTasks}
				gridCellProps={gridCellProps}
				projectBinding={projectBinding}
				rowProps={rowProps}
				rowRef={rowRef}
				rowState={rowState}
				showSpaceLabel={showSpaceLabel}
				task={task}
				visibleProperties={visibleProperties}
			/>
		</TestProviders>,
	)

	return { task, rowState, projectBinding, actions }
}

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
		onToggleTaskSelection: vi.fn(),
		onUpdateTaskPriority: vi.fn().mockResolvedValue(undefined),
		onUpdateTaskStatus: vi.fn().mockResolvedValue(undefined),
		onUpdateTaskDueDate: vi.fn().mockResolvedValue(undefined),
		onUpdateTaskScheduledAt: vi.fn().mockResolvedValue(undefined),
		onUpdateTaskReminderAt: vi.fn().mockResolvedValue(undefined),
		onToggleTaskStatus: vi.fn().mockResolvedValue(undefined),
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

function buildContextMenuActions(): TaskContextMenuBulkActions {
	return {
		onSelectDueDate: vi.fn(),
		onSelectPlacement: vi.fn(),
		onSelectPriority: vi.fn(),
		onSelectStatus: vi.fn(),
	}
}

function TestProviders({
	children,
	onCommand = () => undefined,
}: {
	children: React.ReactNode
	onCommand?: (commandId: string, context: CommandContext, invocation: CommandInvocation) => void
}) {
	const context = createEmptyCommandContext()
	const commands: Command[] = [
		[COMMAND_IDS.taskOpenDetail, '打开任务详情'],
		[COMMAND_IDS.taskSetPriority, '设置任务优先级'],
		[COMMAND_IDS.taskSetStatus, '设置任务状态'],
		[COMMAND_IDS.taskOpenDateMenu, '设置任务日期'],
		[COMMAND_IDS.taskChangePlacement, '移动到...'],
		[COMMAND_IDS.taskArchive, '归档任务'],
		[COMMAND_IDS.taskDelete, '删除任务'],
	].map(([id, title]) => ({
		id,
		title,
		category: 'task',
		scope: ['task-list'],
		run: (target, invocation) => onCommand(id, target, invocation),
	}))
	const runtime = new CommandRuntime({
		registry: new CommandRegistry(commands),
		getContext: () => context,
	})
	return (
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<CommandRuntimeProvider context={context} runtime={runtime}>
				<DangerConfirmProvider>{children}</DangerConfirmProvider>
			</CommandRuntimeProvider>
		</ShortcutRegistryProvider>
	)
}
