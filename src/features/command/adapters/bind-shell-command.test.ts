import { createShellCommandRegistry } from '@/features/command/commands'
import {
	CommandRuntime,
	COMMAND_IDS,
	createEmptyCommandContext,
	type CommandContext,
	type CommandSelectedEntity,
} from '@/features/command/core'

import type { ShellCommandActions, ShellCommandAdapter } from './shell-command-actions'

const invocation = { source: 'global-shortcut' } as const

describe('bindShellCommand / ShellCommandAdapter', () => {
	it.each([
		[COMMAND_IDS.openSearch, 'focusSearch'],
		[COMMAND_IDS.openCommandMenu, 'openCommandMenu'],
		[COMMAND_IDS.openShortcutHelp, 'openShortcutHelp'],
		[COMMAND_IDS.newQuickTask, 'openQuickTaskCreate'],
		[COMMAND_IDS.newFullTask, 'openFullTaskCreate'],
		[COMMAND_IDS.newStandaloneTask, 'openStandaloneTaskCreate'],
		[COMMAND_IDS.newProject, 'openProjectCreate'],
		[COMMAND_IDS.openTask, 'openTaskPicker'],
		[COMMAND_IDS.openProject, 'openProjectPicker'],
		[COMMAND_IDS.goBack, 'goBack'],
		[COMMAND_IDS.goForward, 'goForward'],
		[COMMAND_IDS.layoutToggleSidebar, 'toggleSidebar'],
	] as const)('%s 调用 Shell 端口 %s', async (commandId, actionName) => {
		const actions = createActions()

		await createRuntime(actions).execute(commandId, invocation)

		expect(actions[actionName]).toHaveBeenCalledOnce()
	})

	it.each([
		[COMMAND_IDS.saveOrSubmit, 'submitActiveForm'],
		[COMMAND_IDS.submitAndContinue, 'submitAndContinue'],
		[COMMAND_IDS.submitAndOpen, 'submitAndOpen'],
	] as const)('提交命令 %s 分发到 %s', async (commandId, actionName) => {
		const actions = createActions()
		const context: CommandContext = {
			...createEmptyCommandContext(),
			submit: {
				hasActiveTarget: true,
				canSubmitDefault: true,
				canSubmitContinue: true,
				canSubmitOpen: true,
			},
		}

		await createRuntime(actions, context).execute(commandId, invocation)

		expect(actions[actionName]).toHaveBeenCalledWith(context, invocation)
	})

	it('不支持的提交 intent 返回自己的 disabled reason', async () => {
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

		await expect(runtime.execute(COMMAND_IDS.submitAndOpen, invocation)).resolves.toEqual({
			status: 'disabled',
			commandId: COMMAND_IDS.submitAndOpen,
			reason: '当前表单不支持创建并打开',
		})
	})

	it.each(['archive', 'trash', 'settings'] as const)('在 %s 页面禁用快速新建任务', async (page) => {
		const actions = createActions()
		const runtime = createRuntime(actions, {
			...createEmptyCommandContext(),
			route: { page },
		})

		await expect(runtime.execute(COMMAND_IDS.newQuickTask, invocation)).resolves.toEqual({
			status: 'disabled',
			commandId: COMMAND_IDS.newQuickTask,
			reason: '当前页面不支持快速新建任务',
		})
		expect(actions.openQuickTaskCreate).not.toHaveBeenCalled()
	})

	it.each([
		[COMMAND_IDS.goStandalone, 'standalone'],
		[COMMAND_IDS.goAllTasks, 'tasks'],
		[COMMAND_IDS.goFocus, 'views/focus'],
		[COMMAND_IDS.goViews, 'views'],
		[COMMAND_IDS.goProjects, 'projects'],
		[COMMAND_IDS.goArchive, 'archive'],
		[COMMAND_IDS.goTrash, 'trash'],
		[COMMAND_IDS.openSettings, 'settings'],
	] as const)('%s 导航到 %s', async (commandId, target) => {
		const actions = createActions()

		await createRuntime(actions).execute(commandId, invocation)

		expect(actions.navigateTo).toHaveBeenCalledWith(target)
	})

	it.each([
		[COMMAND_IDS.newView, '视图创建入口尚未接入'],
		[COMMAND_IDS.goToday, '目标页面尚未接入'],
		[COMMAND_IDS.goUpcoming, '目标页面尚未接入'],
		[COMMAND_IDS.goRecent, '目标页面尚未接入'],
		[COMMAND_IDS.openView, '视图搜索尚未接入'],
		[COMMAND_IDS.openSpace, 'Space 搜索尚未接入'],
		[COMMAND_IDS.openRecent, '最近访问选择尚未接入'],
		[COMMAND_IDS.projectRename, '项目命令尚未接入'],
		[COMMAND_IDS.filterToggleCompleted, '当前页面不支持完成筛选'],
		[COMMAND_IDS.systemOpenDataFolder, '系统命令尚未接入'],
		[COMMAND_IDS.viewSuggestFilters, '视图建议命令尚未接入'],
	] as const)('未接入命令 %s 保持 disabled', async (commandId, reason) => {
		await expect(
			createRuntime(createActions()).execute(commandId, invocation),
		).resolves.toMatchObject({
			status: 'disabled',
			commandId,
			reason,
		})
	})

	it.each([
		[COMMAND_IDS.taskComplete, 'task', 'completeSelectedTasks'],
		[COMMAND_IDS.taskChangePlacement, 'task', 'openTaskPlacementPicker'],
		[COMMAND_IDS.taskSetPriority, 'task', 'openTaskPriorityPicker'],
		[COMMAND_IDS.taskSetStatus, 'task', 'openTaskStatusPicker'],
		[COMMAND_IDS.taskOpenDateMenu, 'task', 'openTaskDatePicker'],
		[COMMAND_IDS.taskArchive, 'task', 'requestArchiveSelectedTasks'],
		[COMMAND_IDS.taskDelete, 'task', 'requestDeleteSelectedTasks'],
		[COMMAND_IDS.projectArchive, 'project', 'requestArchiveSelectedProjects'],
		[COMMAND_IDS.projectDelete, 'project', 'requestDeleteSelectedProjects'],
	] as const)('%s 将 %s selection 分发到 %s', async (commandId, selectionType, actionName) => {
		const actions = createActions()
		const context = createSelectionContext(selectionType)

		await createRuntime(actions, context).execute(commandId, invocation)

		expect(actions[actionName]).toHaveBeenCalledWith(context, invocation)
	})

	it.each([
		['task', 'projects', 'requestDeleteSelectedTasks'],
		['project', 'projects', 'requestDeleteSelectedProjects'],
		['lifecycle', 'archive', 'requestDeleteSelectedLifecycleEntries'],
		['lifecycle', 'trash', 'requestDeletePermanentlySelectedLifecycleEntries'],
	] as const)(
		'selectionDeleteByRoute 在 %s/%s 分发到 %s',
		async (selectionType, page, actionName) => {
			const actions = createActions()
			const context = createSelectionContext(selectionType, page)

			await createRuntime(actions, context).execute(COMMAND_IDS.selectionDeleteByRoute, invocation)

			expect(actions[actionName]).toHaveBeenCalledWith(context, invocation)
		},
	)

	it.each([
		COMMAND_IDS.taskComplete,
		COMMAND_IDS.taskChangePlacement,
		COMMAND_IDS.taskSetPriority,
		COMMAND_IDS.taskSetStatus,
		COMMAND_IDS.taskOpenDateMenu,
		COMMAND_IDS.taskArchive,
		COMMAND_IDS.taskDelete,
	])('没有 task selection 时禁用 %s', async (commandId) => {
		await expect(
			createRuntime(createActions()).execute(commandId, invocation),
		).resolves.toMatchObject({
			status: 'disabled',
			commandId,
			reason: '需要先选择任务',
		})
	})

	it('任务 selection 可切换预览，没有任务上下文时禁用', async () => {
		const actions = createActions()
		const context = createSelectionContext('task')

		await createRuntime(actions, context).execute(COMMAND_IDS.layoutTogglePreview, invocation)
		expect(actions.togglePreview).toHaveBeenCalledWith(context, invocation)

		await expect(
			createRuntime(createActions()).execute(COMMAND_IDS.layoutTogglePreview, invocation),
		).resolves.toMatchObject({
			status: 'disabled',
			commandId: COMMAND_IDS.layoutTogglePreview,
			reason: '当前没有可打开的任务预览',
		})
	})

	it('缺域 handler 时对应命令禁用', async () => {
		const { completeSelectedTasks: _omit, ...chromeOnly } = createActions()

		await expect(
			createRuntime(chromeOnly).execute(COMMAND_IDS.taskComplete, invocation),
		).resolves.toMatchObject({
			status: 'disabled',
			commandId: COMMAND_IDS.taskComplete,
			reason: '该命令处理器尚未注册',
		})
	})
})

function createRuntime(
	actions: ShellCommandAdapter,
	context: CommandContext = createEmptyCommandContext(),
) {
	return new CommandRuntime({
		registry: createShellCommandRegistry(actions),
		getContext: () => context,
	})
}

function createSelectionContext(
	type: 'task' | 'project' | 'lifecycle',
	page: CommandContext['route']['page'] = 'projects',
): CommandContext {
	const id = `${type}-a`
	const entity: CommandSelectedEntity = {
		id,
		type,
		title: '测试对象',
		...(type === 'task' ? { spaceId: 'space-a' } : {}),
		...(type === 'lifecycle'
			? {
					lifecycleMode: page === 'trash' ? ('trash' as const) : ('archive' as const),
					lifecycleEntityType: 'task' as const,
				}
			: {}),
	}

	return {
		...createEmptyCommandContext(),
		route: { page },
		selection: {
			type,
			ids: [id],
			entities: [entity],
			primaryEntity: entity,
			source:
				type === 'task' ? 'task-list' : type === 'project' ? 'project-list' : 'lifecycle-list',
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		},
	}
}

function createActions(overrides: Partial<ShellCommandActions> = {}): ShellCommandActions {
	return {
		openCommandMenu: vi.fn(),
		openShortcutHelp: vi.fn(),
		focusSearch: vi.fn(),
		openQuickTaskCreate: vi.fn(),
		openFullTaskCreate: vi.fn(),
		openStandaloneTaskCreate: vi.fn(),
		openProjectCreate: vi.fn(),
		openTaskPicker: vi.fn(),
		openProjectPicker: vi.fn(),
		peekTask: vi.fn(),
		openTaskDetail: vi.fn(),
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
		openFilterMenu: vi.fn(),
		toggleCompletedFilter: vi.fn(),
		clearAllFilters: vi.fn(),
		openDisplayOptions: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
		...overrides,
	}
}
