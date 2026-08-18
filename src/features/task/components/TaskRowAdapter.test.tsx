import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRef } from 'react'

import {
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	COMMAND_IDS,
	createEmptyCommandContext,
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
	type Command,
	type CommandContext,
	type CommandInvocation,
} from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
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
	onContextMenuOpenChange,
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
	onContextMenuOpenChange?: TaskRowAdapterProps['onContextMenuOpenChange']
	onCommand?: (commandId: string, context: CommandContext, invocation: CommandInvocation) => void
} = {}) {
	const { container } = render(
		<TestProviders onCommand={onCommand}>
			<TaskRowAdapter
				actions={actions}
				contextMenuActions={contextMenuActions}
				contextTasks={contextTasks}
				gridCellProps={gridCellProps}
				onContextMenuOpenChange={onContextMenuOpenChange}
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

	return { task, rowState, projectBinding, actions, container }
}

describe('TaskRowAdapter', () => {
	it('行点击按 command ID 执行单行目标', () => {
		const onCommand = vi.fn()
		renderTaskRowAdapter({ onCommand })

		fireEvent.click(screen.getByLabelText('打开任务 任务 A'))
		expect(onCommand).toHaveBeenCalledWith(
			COMMAND_IDS.taskOpenDetail,
			expect.objectContaining({
				selection: expect.objectContaining({ ids: ['task-1'] }),
			}),
			{ source: 'row' },
		)
	})

	it('接收 React Aria row/gridcell/ref，并覆盖 press click 保持行点击只打开详情', () => {
		const reactAriaPressClick = vi.fn()
		const rowRef = createRef<HTMLDivElement>()
		const { actions } = renderTaskRowAdapter({
			rowState: {
				isSelected: false,
				isPending: false,
				isFocused: true,
				focusSource: 'keyboard',
			},
			rowProps: {
				role: 'row',
				tabIndex: 0,
				'aria-selected': false,
				onClick: reactAriaPressClick,
			},
			gridCellProps: { role: 'gridcell' },
			rowRef,
		})

		const row = screen.getByRole('row', { name: '打开任务 任务 A' })
		const title = screen.getByText('任务 A')
		expect(rowRef.current).toBe(row)
		expect(row).toHaveStyle({ height: '44px' })
		expect(row).toHaveClass('text-[13px]', 'leading-5')
		expect(title).toHaveClass('font-medium')
		expect(title).not.toHaveClass('text-[13px]')
		expect(row).toHaveAttribute('data-focus-source', 'keyboard')
		expect(row.className).toContain('focus-visible:border-focus-subtle')
		expect(row.className).toContain('forced-colors:focus-visible:border-[Highlight]')
		expect(row.className.split(/\s+/)).not.toContain('border-focus-subtle')
		expect(row.className).not.toContain('ring-focus')
		expect(within(row).getByRole('gridcell')).toBeInTheDocument()
		fireEvent.click(row)

		expect(actions.onToggleTaskSelection).not.toHaveBeenCalled()
		expect(reactAriaPressClick).not.toHaveBeenCalled()
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

		fireEvent.click(screen.getByRole('checkbox', { name: '选择任务：任务 A' }))
		expect(actions.onToggleTaskSelection).toHaveBeenCalledWith('task-1')
	})

	it('优先级和状态变更回调透传', async () => {
		const { actions, task } = renderTaskRowAdapter()

		fireEvent.pointerDown(screen.getByRole('button', { name: '修改优先级：任务 A' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /高/ }))
		expect(actions.onUpdateTaskPriority).toHaveBeenCalledWith(task, 3)

		fireEvent.pointerDown(screen.getByRole('button', { name: '修改状态：任务 A' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /已完成/ }))
		expect(actions.onUpdateTaskStatus).toHaveBeenCalledWith(task, 'done')
	})

	it.each([
		['checkbox', '选择任务：任务 A', '选择任务', 'X'],
		['button', '修改优先级：任务 A', '修改优先级', 'P'],
		['button', '修改状态：任务 A', '修改状态', 'S'],
		['button', '修改截止时间：任务 A', '修改截止时间', 'D'],
	] as const)(
		'任务行 %s Tooltip 只展示稳定动作和 Registry 快捷键',
		async (role, accessibleName, tooltipLabel, shortcut) => {
			renderTaskRowAdapter()

			fireEvent.keyDown(document, { key: 'Tab' })
			screen.getByRole(role, { name: accessibleName }).focus()
			const tooltip = await screen.findByRole('tooltip')
			expect(tooltip).toHaveTextContent(`${tooltipLabel}${shortcut}`)
			expect(tooltip).not.toHaveTextContent('任务 A')
			expect(screen.getByLabelText(`按 ${shortcut}`)).toBeInTheDocument()
		},
	)

	it.each([
		['选择任务：任务 A', '选择任务', '正在更新任务，暂时无法更改选择', '按 X'],
		['修改优先级：任务 A', '修改优先级', '正在更新任务，暂时无法修改优先级', '按 P'],
		['修改状态：任务 A', '修改状态', '正在更新任务，暂时无法修改状态', '按 S'],
		['修改截止时间：任务 A', '修改截止时间', '正在更新任务，暂时无法修改截止时间', '按 D'],
		['修改计划时间：任务 A', '修改计划时间', '正在更新任务，暂时无法修改计划时间', null],
		['归属', '归属', '正在更新任务，暂时无法修改归属', '按 Shift + P'],
	] as const)(
		'pending 时 %s Tooltip 保留动作、快捷键和原因，但不显示任务名',
		async (accessibleName, tooltipLabel, disabledReason, shortcutLabel) => {
			renderTaskRowAdapter({
				rowState: {
					isSelected: false,
					isPending: true,
					isFocused: false,
					focusSource: null,
				},
			})

			fireEvent.keyDown(document, { key: 'Tab' })
			screen.getByRole('group', { name: accessibleName }).focus()
			const tooltip = await screen.findByRole('tooltip')
			expect(tooltip).toHaveTextContent(tooltipLabel)
			expect(tooltip).toHaveTextContent(disabledReason)
			expect(tooltip).not.toHaveTextContent('任务 A')
			expect(
				tooltip
					.querySelector('[data-slot="action-tooltip-shortcut"] [aria-label]')
					?.getAttribute('aria-label') ?? null,
			).toBe(shortcutLabel)
		},
	)

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

		expect(screen.queryByRole('button', { name: '修改优先级：任务 A' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '修改状态：任务 A' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '归属' })).toBeInTheDocument()
		expect(screen.getByText('5/7')).toBeInTheDocument()
		expect(screen.queryByText('5/6')).not.toBeInTheDocument()
		expect(screen.queryByText('5/8')).not.toBeInTheDocument()
	})

	it('尾部字段只按任务列表的 560px 容器断点显示', () => {
		const { container } = renderTaskRowAdapter()
		const fields = [...container.querySelectorAll('div')].find((element) =>
			element.className.includes('@min-[560px]/task-list:flex'),
		)

		expect(fields).toBeTruthy()
		expect(fields?.className).toContain('hidden')
		expect(fields?.className).not.toContain('md:flex')
	})

	it('右键菜单属性动作在多选时统一走 placement bulk 入口', async () => {
		const task = buildTask()
		const contextTasks = [task, buildTask({ id: 'task-2', title: '任务 B', projectId: null })]
		const contextMenuActions = buildContextMenuActions()
		const projectBinding = createProjectBinding()
		const onContextMenuOpenChange = vi.fn()

		renderTaskRowAdapter({
			contextMenuActions,
			contextTasks,
			onContextMenuOpenChange,
			projectBinding,
			task,
		})

		fireEvent.contextMenu(screen.getByLabelText('打开任务 任务 A'))
		await screen.findByRole('menu', { name: '任务操作' })
		expect(onContextMenuOpenChange).toHaveBeenCalledWith(true)
		fireEvent.click(await screen.findByRole('menuitem', { name: /移动到/ }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /独立事项/ }))
		expect(contextMenuActions.onSelectPlacement).toHaveBeenCalledWith(contextTasks, {
			kind: 'standalone',
			spaceId: 'space-1',
		})
		expect(projectBinding.onSelectPlacement).not.toHaveBeenCalled()

		fireEvent.contextMenu(screen.getByLabelText('打开任务 任务 A'))
		fireEvent.click(await screen.findByRole('menuitem', { name: /移动到/ }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))
		expect(contextMenuActions.onSelectPlacement).toHaveBeenCalledWith(contextTasks, {
			kind: 'project',
			spaceId: 'space-1',
			projectId: 'project-2',
		})
		await waitFor(() => expect(onContextMenuOpenChange).toHaveBeenCalledWith(false))
	})

	it('鼠标和键盘 current 复用表面，细边框只由真实 focus-visible 决定', () => {
		const task = buildTask()
		const actions = buildActions()
		const { rerender } = render(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isSelected: false,
						isPending: false,
						isFocused: true,
						focusSource: 'pointer',
					}}
					task={task}
				/>
			</TestProviders>,
		)

		const row = screen.getByLabelText('打开任务 任务 A')
		expect(row.className).toContain('bg-surface-hover')
		expect(row.className).toContain('focus-visible:border-transparent')
		expect(row.className).not.toContain('focus-visible:border-focus-subtle')
		expect(row.className.split(/\s+/)).not.toContain('border-focus-subtle')

		rerender(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isSelected: true,
						isPending: false,
						isFocused: true,
						focusSource: 'keyboard',
					}}
					selectionGroupPosition='single'
					task={task}
				/>
			</TestProviders>,
		)

		expect(row.className).toContain('bg-accent-soft-hover')
		expect(row.className).toContain('focus-visible:border-focus-subtle')
		expect(row.className.split(/\s+/)).not.toContain('border-focus-subtle')

		rerender(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isSelected: true,
						isPending: false,
						isFocused: true,
						focusSource: 'keyboard',
						suppressFocusIndicator: true,
					}}
					selectionGroupPosition='single'
					task={task}
				/>
			</TestProviders>,
		)

		expect(row).toHaveAttribute('data-focus-source', 'keyboard')
		expect(row).toHaveClass('border-transparent')
		expect(row.className).toContain('focus-visible:border-transparent')
		expect(row.className).not.toContain('focus-visible:border-focus-subtle')
		expect(row.className.split(/\s+/)).not.toContain('border-focus-subtle')
		expect(row.className).toContain('forced-colors:focus-visible:border-[Highlight]')

		rerender(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isSelected: false,
						isPending: false,
						isFocused: false,
						focusSource: 'keyboard',
					}}
					task={task}
				/>
			</TestProviders>,
		)

		expect(row.className).toContain('hover:bg-transparent')
		expect(row.className.split(/\s+/)).not.toContain('border-focus-subtle')
	})

	it('selected/pending 由 RowShell 统一映射表面状态', () => {
		const task = buildTask()
		const actions = buildActions()
		const { rerender } = render(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isSelected: true,
						isPending: true,
						isFocused: false,
						focusSource: null,
					}}
					selectionGroupPosition='single'
					task={task}
				/>
			</TestProviders>,
		)

		const row = screen.getByLabelText('打开任务 任务 A')
		expect(row.className).toContain('bg-accent-soft')
		expect(row.className).toContain('hover:bg-accent-soft-hover')
		expect(row).not.toHaveClass('border-focus-subtle')
		expect(row.className).toContain('opacity-75')

		rerender(
			<TestProviders>
				<TaskRowAdapter
					actions={actions}
					projectBinding={createProjectBinding()}
					rowState={{
						isSelected: true,
						isPending: false,
						isFocused: false,
						focusSource: null,
					}}
					selectionGroupPosition='single'
					task={task}
				/>
			</TestProviders>,
		)

		const selectedRow = screen.getByLabelText('打开任务 任务 A')
		expect(selectedRow.className).toContain('bg-accent-soft')
		expect(screen.getByRole('checkbox', { name: '选择任务：任务 A' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
	})

	it('右键菜单危险动作执行 context-menu 命令投影', async () => {
		const onCommand = vi.fn()
		renderTaskRowAdapter({ onCommand })
		const row = screen.getByLabelText('打开任务 任务 A')

		fireEvent.contextMenu(row)
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

function buildContextMenuActions(): TaskContextMenuBulkActions {
	return {
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
