import {
	CommandRegistry,
	CommandRuntime,
	createEmptyCommandContext,
	type Command,
	type CommandInvocation,
} from '@/features/command/core'

const context = createEmptyCommandContext()
const invocation = { source: 'global-shortcut' } satisfies CommandInvocation

describe('CommandRuntime', () => {
	it('重复 command id 会在注册阶段失败', () => {
		const command = createCommand('test.duplicate')

		expect(() => new CommandRegistry([command, command])).toThrow(
			'Duplicate command id: test.duplicate',
		)
	})

	it('未知 command 返回 not-found', async () => {
		const runtime = new CommandRuntime({
			registry: new CommandRegistry(),
			getContext: () => context,
		})

		await expect(runtime.execute('test.missing', invocation)).resolves.toEqual({
			status: 'not-found',
			commandId: 'test.missing',
		})
	})

	it('不可见 command 不执行', async () => {
		const run = vi.fn()
		const command = createCommand('test.hidden', {
			isVisible: () => false,
			run,
		})
		const runtime = createRuntime(command)

		await expect(runtime.execute(command.id, invocation)).resolves.toEqual({
			status: 'hidden',
			commandId: command.id,
		})
		expect(run).not.toHaveBeenCalled()
	})

	it('禁用 command 不执行并返回原因', async () => {
		const run = vi.fn()
		const command = createCommand('test.disabled', {
			isEnabled: () => false,
			getDisabledReason: () => '当前没有目标',
			run,
		})
		const runtime = createRuntime(command)

		await expect(runtime.execute(command.id, invocation)).resolves.toEqual({
			status: 'disabled',
			commandId: command.id,
			reason: '当前没有目标',
		})
		expect(run).not.toHaveBeenCalled()
	})

	it('投影固定展示状态与目标，并从唯一入口执行同一 context', async () => {
		const targetContext = createTaskContext('task-a')
		const contextMenuInvocation = { source: 'context-menu' } satisfies CommandInvocation
		let currentContext = targetContext
		const run = vi.fn()
		const command = createCommand('test.projected', {
			title: '投影命令',
			description: '验证目标快照',
			keywords: ['projection', '快照'],
			isEnabled: (ctx) => ctx.selection.ids.includes('task-a'),
			getDisabledReason: () => '当前没有目标',
			getPriority: () => 42,
			run,
		})
		const runtime = new CommandRuntime({
			registry: new CommandRegistry([command]),
			getContext: () => currentContext,
		})

		const projection = runtime.project(command.id, targetContext)
		currentContext = createTaskContext('task-b')

		expect(projection).toMatchObject({
			id: command.id,
			label: '投影命令',
			description: '验证目标快照',
			keywords: ['projection', '快照'],
			visible: true,
			enabled: true,
			disabledReason: undefined,
			priority: 42,
			target: targetContext,
		})
		await expect(projection?.execute(contextMenuInvocation)).resolves.toEqual({
			status: 'success',
			commandId: command.id,
		})
		expect(run).toHaveBeenCalledWith(targetContext, contextMenuInvocation)
	})

	it('projectAll 只读取一次当前 context，并让全部投影共享该目标', () => {
		const targetContext = createTaskContext('task-a')
		const getContext = vi.fn(() => targetContext)
		const runtime = new CommandRuntime({
			registry: new CommandRegistry([createCommand('test.first'), createCommand('test.second')]),
			getContext,
		})

		const projections = runtime.projectAll()

		expect(getContext).toHaveBeenCalledTimes(1)
		expect(projections.map((projection) => projection.id)).toEqual(['test.first', 'test.second'])
		expect(projections.every((projection) => projection.target === targetContext)).toBe(true)
	})

	it('可执行 command 成功返回 success', async () => {
		const run = vi.fn()
		const command = createCommand('test.success', { run })
		const runtime = createRuntime(command)

		await expect(runtime.execute(command.id, invocation)).resolves.toEqual({
			status: 'success',
			commandId: command.id,
		})
		expect(run).toHaveBeenCalledWith(context, invocation)
	})

	it('command 抛错时返回 failed 并通知错误处理器', async () => {
		const error = new Error('boom')
		const onError = vi.fn()
		const command = createCommand('test.failed', {
			run: () => {
				throw error
			},
		})
		const runtime = new CommandRuntime({
			registry: new CommandRegistry([command]),
			getContext: () => context,
			onError,
		})

		await expect(runtime.execute(command.id, invocation)).resolves.toEqual({
			status: 'failed',
			commandId: command.id,
			error,
		})
		expect(onError).toHaveBeenCalledWith(error, command, context)
	})
})

function createRuntime(command: Command) {
	return new CommandRuntime({
		registry: new CommandRegistry([command]),
		getContext: () => context,
	})
}

function createCommand(id: string, overrides: Partial<Command> = {}): Command {
	return {
		id,
		title: id,
		category: 'general',
		scope: ['global'],
		run: () => {},
		...overrides,
	}
}

function createTaskContext(taskId: string) {
	return {
		...context,
		selection: {
			...context.selection,
			type: 'task' as const,
			ids: [taskId],
			entities: [{ id: taskId, type: 'task' as const, title: taskId }],
			primaryEntity: { id: taskId, type: 'task' as const, title: taskId },
			source: 'task-list' as const,
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		},
	}
}
