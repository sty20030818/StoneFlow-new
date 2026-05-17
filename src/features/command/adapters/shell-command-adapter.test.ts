import { createShellCommandRegistry } from '@/features/command/commands'
import {
	CommandRuntime,
	COMMAND_IDS,
	createEmptyCommandContext,
	type CommandContext,
} from '@/features/command/core'
import type { ShellCommandActions } from './shell-command-adapter'

describe('Shell command adapter', () => {
	it('执行 general 命令时调用 Shell action', async () => {
		const actions = createActions()
		const runtime = createRuntime(actions)

		await expect(runtime.execute(COMMAND_IDS.openSearch)).resolves.toEqual({
			status: 'success',
			commandId: COMMAND_IDS.openSearch,
		})
		await runtime.execute(COMMAND_IDS.openCommandMenu)
		await runtime.execute(COMMAND_IDS.openShortcutHelp)

		expect(actions.focusSearch).toHaveBeenCalledTimes(1)
		expect(actions.openCommandMenu).toHaveBeenCalledTimes(1)
		expect(actions.openShortcutHelp).toHaveBeenCalledTimes(1)
	})

	it('执行 new 命令时调用对应创建 action', async () => {
		const actions = createActions()
		const runtime = createRuntime(actions)

		await runtime.execute(COMMAND_IDS.newQuickTask)
		await runtime.execute(COMMAND_IDS.newFullTask)
		await runtime.execute(COMMAND_IDS.newTaskInInbox)
		await runtime.execute(COMMAND_IDS.newProject)

		expect(actions.openQuickTaskCreate).toHaveBeenCalledTimes(1)
		expect(actions.openFullTaskCreate).toHaveBeenCalledTimes(1)
		expect(actions.openInboxTaskCreate).toHaveBeenCalledTimes(1)
		expect(actions.openProjectCreate).toHaveBeenCalledTimes(1)
	})

	it('执行 open 任务和项目命令时打开 scoped picker', async () => {
		const actions = createActions()
		const runtime = createRuntime(actions)

		await runtime.execute(COMMAND_IDS.openTask)
		await runtime.execute(COMMAND_IDS.openProject)

		expect(actions.openTaskPicker).toHaveBeenCalledTimes(1)
		expect(actions.openProjectPicker).toHaveBeenCalledTimes(1)
	})

	it.each(['archive', 'trash', 'settings'] as const)('在 %s 页面禁用快速新建任务', async (page) => {
		const actions = createActions()
		const runtime = createRuntime(actions, {
			...createEmptyCommandContext(),
			route: {
				page,
			},
		})

		await expect(runtime.execute(COMMAND_IDS.newQuickTask)).resolves.toEqual({
			status: 'disabled',
			commandId: COMMAND_IDS.newQuickTask,
			reason: '当前页面不支持快速新建任务',
		})
		expect(actions.openQuickTaskCreate).not.toHaveBeenCalled()
	})

	it('未接入 UI 的 new.view 返回 disabled 且不产生副作用', async () => {
		const actions = createActions()
		const runtime = createRuntime(actions)

		await expect(runtime.execute(COMMAND_IDS.newView)).resolves.toEqual({
			status: 'disabled',
			commandId: COMMAND_IDS.newView,
			reason: '视图创建入口尚未接入',
		})
		expect(actions.openProjectCreate).not.toHaveBeenCalled()
	})

	it.each([
		[COMMAND_IDS.goInbox, 'inbox'],
		[COMMAND_IDS.goAllTasks, 'all-tasks'],
		[COMMAND_IDS.goFocus, 'focus'],
		[COMMAND_IDS.goViews, 'views'],
		[COMMAND_IDS.goProjects, 'projects'],
		[COMMAND_IDS.goArchive, 'archive'],
		[COMMAND_IDS.goTrash, 'trash'],
		[COMMAND_IDS.goSettings, 'settings'],
	] as const)('执行 %s 时导航到 %s', async (commandId, target) => {
		const actions = createActions()
		const runtime = createRuntime(actions)

		await runtime.execute(commandId)

		expect(actions.navigateTo).toHaveBeenCalledWith(target)
	})

	it('执行历史导航命令时调用 Shell history action', async () => {
		const actions = createActions()
		const runtime = createRuntime(actions)

		await runtime.execute(COMMAND_IDS.goBack)
		await runtime.execute(COMMAND_IDS.goForward)

		expect(actions.goBack).toHaveBeenCalledTimes(1)
		expect(actions.goForward).toHaveBeenCalledTimes(1)
	})

	it.each([COMMAND_IDS.goToday, COMMAND_IDS.goUpcoming, COMMAND_IDS.goRecent])(
		'未确认真实页面的导航命令 %s 返回 disabled',
		async (commandId) => {
			const runtime = createRuntime(createActions())

			await expect(runtime.execute(commandId)).resolves.toMatchObject({
				status: 'disabled',
				commandId,
				reason: '目标页面尚未接入',
			})
		},
	)

	it.each([
		[COMMAND_IDS.openView, '视图搜索尚未接入'],
		[COMMAND_IDS.openSpace, 'Space 搜索尚未接入'],
		[COMMAND_IDS.openRecent, '最近访问选择尚未接入'],
	] as const)('未接入搜索能力的 open 命令 %s 返回 disabled', async (commandId, reason) => {
		const runtime = createRuntime(createActions())

		await expect(runtime.execute(commandId)).resolves.toMatchObject({
			status: 'disabled',
			commandId,
			reason,
		})
	})

	it.each([
		[COMMAND_IDS.taskMoveToProject, 'Row 上下文尚未接入'],
		[COMMAND_IDS.projectRename, '项目命令尚未接入'],
		[COMMAND_IDS.filterToggleCompleted, '筛选命令尚未接入'],
		[COMMAND_IDS.layoutToggleSidebar, '布局命令尚未接入'],
		[COMMAND_IDS.systemOpenDataFolder, '系统命令尚未接入'],
		[COMMAND_IDS.inboxClean, 'Inbox 清理命令尚未接入'],
		[COMMAND_IDS.viewSuggestFilters, '视图建议命令尚未接入'],
	] as const)('command-only 命令 %s 返回 disabled', async (commandId, reason) => {
		const runtime = createRuntime(createActions())

		await expect(runtime.execute(commandId)).resolves.toMatchObject({
			status: 'disabled',
			commandId,
			reason,
		})
	})

	it.each([
		[COMMAND_IDS.taskComplete, 'completeSelectedTasks'],
		[COMMAND_IDS.taskSetPriority, 'openTaskPriorityPicker'],
		[COMMAND_IDS.taskSetStatus, 'openTaskStatusPicker'],
		[COMMAND_IDS.taskOpenDateMenu, 'openTaskDatePicker'],
		[COMMAND_IDS.taskArchive, 'requestArchiveSelectedTasks'],
		[COMMAND_IDS.taskDelete, 'requestDeleteSelectedTasks'],
	] as const)('有 task selection 时执行批量任务命令 %s', async (commandId, actionName) => {
		const actions = createActions()
		const context = {
			...createEmptyCommandContext(),
			selection: {
				type: 'task' as const,
				ids: ['task-a', 'task-b'],
				entities: [
					{ id: 'task-a', type: 'task' as const, title: '任务 A' },
					{ id: 'task-b', type: 'task' as const, title: '任务 B' },
				],
				primaryEntity: { id: 'task-a', type: 'task' as const, title: '任务 A' },
				source: 'task-list' as const,
				hasSelection: true,
				isSingleSelection: false,
				isMultiSelection: true,
			},
		}
		const runtime = createRuntime(actions, context)

		await expect(runtime.execute(commandId)).resolves.toMatchObject({
			status: 'success',
			commandId,
		})
		expect(actions[actionName]).toHaveBeenCalledWith(context)
	})

	it.each([
		[COMMAND_IDS.projectArchive, 'requestArchiveSelectedProjects'],
		[COMMAND_IDS.projectDelete, 'requestDeleteSelectedProjects'],
	] as const)('有 project selection 时执行批量项目命令 %s', async (commandId, actionName) => {
		const actions = createActions()
		const context = {
			...createEmptyCommandContext(),
			selection: {
				type: 'project' as const,
				ids: ['project-a', 'project-b'],
				entities: [
					{ id: 'project-a', type: 'project' as const, title: '项目 A' },
					{ id: 'project-b', type: 'project' as const, title: '项目 B' },
				],
				primaryEntity: { id: 'project-a', type: 'project' as const, title: '项目 A' },
				source: 'project-list' as const,
				hasSelection: true,
				isSingleSelection: false,
				isMultiSelection: true,
			},
		}
		const runtime = createRuntime(actions, context)

		await expect(runtime.execute(commandId)).resolves.toMatchObject({
			status: 'success',
			commandId,
		})
		expect(actions[actionName]).toHaveBeenCalledWith(context)
	})

	it.each([
		COMMAND_IDS.taskComplete,
		COMMAND_IDS.taskSetPriority,
		COMMAND_IDS.taskSetStatus,
		COMMAND_IDS.taskOpenDateMenu,
		COMMAND_IDS.taskArchive,
		COMMAND_IDS.taskDelete,
	])(
		'没有 task selection 时禁用批量任务命令 %s',
		async (commandId) => {
			const runtime = createRuntime(createActions())

			await expect(runtime.execute(commandId)).resolves.toMatchObject({
				status: 'disabled',
				commandId,
				reason: '需要先选择任务',
			})
		},
	)

	it('Shell action 抛错时 Runtime 返回 failed', async () => {
		const error = new Error('search failed')
		const actions = createActions({
			focusSearch: () => {
				throw error
			},
		})
		const runtime = createRuntime(actions)

		await expect(runtime.execute(COMMAND_IDS.openSearch)).resolves.toEqual({
			status: 'failed',
			commandId: COMMAND_IDS.openSearch,
			error,
		})
	})
})

function createRuntime(
	actions: ShellCommandActions,
	context: CommandContext = createEmptyCommandContext(),
) {
	return new CommandRuntime({
		registry: createShellCommandRegistry(actions),
		getContext: () => context,
	})
}

function createActions(overrides: Partial<ShellCommandActions> = {}): ShellCommandActions {
	return {
		openCommandMenu: vi.fn(),
		openShortcutHelp: vi.fn(),
		focusSearch: vi.fn(),
		openQuickTaskCreate: vi.fn(),
		openFullTaskCreate: vi.fn(),
		openInboxTaskCreate: vi.fn(),
		openProjectCreate: vi.fn(),
		openTaskPicker: vi.fn(),
		openProjectPicker: vi.fn(),
		openTaskPriorityPicker: vi.fn(),
		openTaskStatusPicker: vi.fn(),
		openTaskDatePicker: vi.fn(),
		completeSelectedTasks: vi.fn(),
		requestArchiveSelectedTasks: vi.fn(),
		requestDeleteSelectedTasks: vi.fn(),
		requestArchiveSelectedProjects: vi.fn(),
		requestDeleteSelectedProjects: vi.fn(),
		restoreSelectedLifecycleEntries: vi.fn(),
		requestDeleteSelectedLifecycleEntries: vi.fn(),
		requestDeletePermanentlySelectedLifecycleEntries: vi.fn(),
		navigateTo: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
		...overrides,
	}
}
