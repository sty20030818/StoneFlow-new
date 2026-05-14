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

		expect(actions.focusSearch).toHaveBeenCalledTimes(1)
		expect(actions.openCommandMenu).toHaveBeenCalledTimes(1)
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

	it.each(['archive', 'trash', 'settings'] as const)(
		'在 %s 页面禁用快速新建任务',
		async (page) => {
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
		},
	)

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

	it.each([
		COMMAND_IDS.goToday,
		COMMAND_IDS.goUpcoming,
		COMMAND_IDS.goRecent,
	])('未确认真实页面的导航命令 %s 返回 disabled', async (commandId) => {
		const runtime = createRuntime(createActions())

		await expect(runtime.execute(commandId)).resolves.toMatchObject({
			status: 'disabled',
			commandId,
			reason: '目标页面尚未接入',
		})
	})

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

function createRuntime(actions: ShellCommandActions, context: CommandContext = createEmptyCommandContext()) {
	return new CommandRuntime({
		registry: createShellCommandRegistry(actions),
		getContext: () => context,
	})
}

function createActions(overrides: Partial<ShellCommandActions> = {}): ShellCommandActions {
	return {
		openCommandMenu: vi.fn(),
		focusSearch: vi.fn(),
		openQuickTaskCreate: vi.fn(),
		openFullTaskCreate: vi.fn(),
		openInboxTaskCreate: vi.fn(),
		openProjectCreate: vi.fn(),
		openTaskPicker: vi.fn(),
		openProjectPicker: vi.fn(),
		navigateTo: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
		...overrides,
	}
}
