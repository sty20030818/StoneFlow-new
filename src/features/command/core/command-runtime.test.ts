import {
	CommandRegistry,
	CommandRuntime,
	createEmptyCommandContext,
	type Command,
} from '@/features/command/core'

const context = createEmptyCommandContext()

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

		await expect(runtime.execute('test.missing')).resolves.toEqual({
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

		await expect(runtime.execute(command.id)).resolves.toEqual({
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

		await expect(runtime.execute(command.id)).resolves.toEqual({
			status: 'disabled',
			commandId: command.id,
			reason: '当前没有目标',
		})
		expect(run).not.toHaveBeenCalled()
	})

	it('可执行 command 成功返回 success', async () => {
		const run = vi.fn()
		const command = createCommand('test.success', { run })
		const runtime = createRuntime(command)

		await expect(runtime.execute(command.id)).resolves.toEqual({
			status: 'success',
			commandId: command.id,
		})
		expect(run).toHaveBeenCalledWith(context)
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

		await expect(runtime.execute(command.id)).resolves.toEqual({
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
