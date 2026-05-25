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

	it('提交类命令走统一 submit action，并按 intent 分流', async () => {
		const actions = createActions()
		const runtime = createRuntime(actions, {
			...createEmptyCommandContext(),
			submit: {
				hasActiveTarget: true,
				canSubmitDefault: true,
				canSubmitContinue: true,
				canSubmitOpen: true,
			},
		})

		await runtime.execute(COMMAND_IDS.saveOrSubmit)
		await runtime.execute(COMMAND_IDS.submitAndContinue)
		await runtime.execute(COMMAND_IDS.submitAndOpen)

		expect(actions.submitActiveForm).toHaveBeenCalledTimes(1)
		expect(actions.submitAndContinue).toHaveBeenCalledTimes(1)
		expect(actions.submitAndOpen).toHaveBeenCalledTimes(1)
	})

	it('不支持的提交 intent 返回 disabled reason', async () => {
		const runtime = createRuntime(createActions(), {
			...createEmptyCommandContext(),
			submit: {
				hasActiveTarget: true,
				canSubmitDefault: true,
				canSubmitContinue: true,
				canSubmitOpen: false,
				submitOpenDisabledReason: '当前表单不支持创建并打开',
			},
		})

		await expect(runtime.execute(COMMAND_IDS.submitAndOpen)).resolves.toEqual({
			status: 'disabled',
			commandId: COMMAND_IDS.submitAndOpen,
			reason: '当前表单不支持创建并打开',
		})
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
		[COMMAND_IDS.goAllTasks, 'tasks'],
		[COMMAND_IDS.goFocus, 'views/focus'],
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

	it('执行布局命令时调用 sidebar / 任务预览切换 action', async () => {
		const actions = createActions()
		const runtime = createRuntime(actions, {
			...createEmptyCommandContext(),
			selection: {
				type: 'task',
				ids: ['task-a'],
				entities: [{ id: 'task-a', type: 'task', title: '任务 A' }],
				primaryEntity: { id: 'task-a', type: 'task', title: '任务 A' },
				source: 'task-list',
				hasSelection: true,
				isSingleSelection: true,
				isMultiSelection: false,
			},
		})

		await runtime.execute(COMMAND_IDS.layoutToggleSidebar)
		await runtime.execute(COMMAND_IDS.layoutTogglePreview)

		expect(actions.toggleSidebar).toHaveBeenCalledTimes(1)
		expect(actions.togglePreview).toHaveBeenCalledTimes(1)
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
		[COMMAND_IDS.projectRename, '项目命令尚未接入'],
		[COMMAND_IDS.filterToggleCompleted, '当前页面不支持完成筛选'],
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
		[COMMAND_IDS.taskChangePlacement, 'openTaskPlacementPicker'],
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
					{ id: 'task-a', type: 'task' as const, title: '任务 A', spaceId: 'space-a' },
					{ id: 'task-b', type: 'task' as const, title: '任务 B', spaceId: 'space-a' },
				],
				primaryEntity: {
					id: 'task-a',
					type: 'task' as const,
					title: '任务 A',
					spaceId: 'space-a',
				},
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

	it('Cmd+Backspace 分发 task selection 到任务删除', async () => {
			const actions = createActions()
			const context = {
				...createEmptyCommandContext(),
				route: { page: 'projects' as const },
				selection: {
					type: 'task' as const,
					ids: ['task-a'],
				entities: [{ id: 'task-a', type: 'task' as const, title: '任务 A' }],
				primaryEntity: { id: 'task-a', type: 'task' as const, title: '任务 A' },
				source: 'task-list' as const,
				hasSelection: true,
				isSingleSelection: true,
				isMultiSelection: false,
			},
		}
		const runtime = createRuntime(actions, context)

		await expect(runtime.execute(COMMAND_IDS.selectionDeleteByRoute)).resolves.toMatchObject({
			status: 'success',
			commandId: COMMAND_IDS.selectionDeleteByRoute,
		})
		expect(actions.requestDeleteSelectedTasks).toHaveBeenCalledWith(context)
	})

	it('Cmd+Backspace 分发 project selection 到项目删除', async () => {
		const actions = createActions()
		const context = {
			...createEmptyCommandContext(),
			route: { page: 'projects' as const },
			selection: {
				type: 'project' as const,
				ids: ['project-a'],
				entities: [{ id: 'project-a', type: 'project' as const, title: '项目 A' }],
				primaryEntity: { id: 'project-a', type: 'project' as const, title: '项目 A' },
				source: 'project-list' as const,
				hasSelection: true,
				isSingleSelection: true,
				isMultiSelection: false,
			},
		}
		const runtime = createRuntime(actions, context)

		await expect(runtime.execute(COMMAND_IDS.selectionDeleteByRoute)).resolves.toMatchObject({
			status: 'success',
			commandId: COMMAND_IDS.selectionDeleteByRoute,
		})
		expect(actions.requestDeleteSelectedProjects).toHaveBeenCalledWith(context)
	})

	it.each([
		['archive', 'requestDeleteSelectedLifecycleEntries'],
		['trash', 'requestDeletePermanentlySelectedLifecycleEntries'],
	] as const)('Cmd+Backspace 在 %s 页分发生命周期删除动作', async (page, actionName) => {
		const actions = createActions()
		const context = {
			...createEmptyCommandContext(),
			route: { page },
			selection: {
				type: 'lifecycle' as const,
				ids: ['entry-a'],
				entities: [{ id: 'entry-a', type: 'lifecycle' as const, title: '条目 A' }],
				primaryEntity: { id: 'entry-a', type: 'lifecycle' as const, title: '条目 A' },
				source: 'lifecycle-list' as const,
				hasSelection: true,
				isSingleSelection: true,
				isMultiSelection: false,
			},
		}
		const runtime = createRuntime(actions, context)

		await expect(runtime.execute(COMMAND_IDS.selectionDeleteByRoute)).resolves.toMatchObject({
			status: 'success',
			commandId: COMMAND_IDS.selectionDeleteByRoute,
		})
		expect(actions[actionName]).toHaveBeenCalledWith(context)
	})

	it.each([
		COMMAND_IDS.taskComplete,
		COMMAND_IDS.taskChangePlacement,
		COMMAND_IDS.taskSetPriority,
		COMMAND_IDS.taskSetStatus,
		COMMAND_IDS.taskOpenDateMenu,
		COMMAND_IDS.taskArchive,
		COMMAND_IDS.taskDelete,
	])('没有 task selection 时禁用批量任务命令 %s', async (commandId) => {
		const runtime = createRuntime(createActions())

		await expect(runtime.execute(commandId)).resolves.toMatchObject({
			status: 'disabled',
			commandId,
			reason: '需要先选择任务',
		})
	})

	it('没有任务上下文时禁用任务预览切换命令', async () => {
		const runtime = createRuntime(createActions())

		await expect(runtime.execute(COMMAND_IDS.layoutTogglePreview)).resolves.toMatchObject({
			status: 'disabled',
			commandId: COMMAND_IDS.layoutTogglePreview,
			reason: '当前没有可打开的任务预览',
		})
	})

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
		openTaskPlacementPicker: vi.fn(),
		applyTaskPlacement: vi.fn(),
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
		closeCurrentLayer: vi.fn(),
		submitActiveForm: vi.fn(),
		submitAndContinue: vi.fn(),
		submitAndOpen: vi.fn(),
		toggleSidebar: vi.fn(),
		togglePreview: vi.fn(),
		openFilterPicker: vi.fn(),
		toggleCompletedFilter: vi.fn(),
		clearAllFilters: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
		...overrides,
	}
}
