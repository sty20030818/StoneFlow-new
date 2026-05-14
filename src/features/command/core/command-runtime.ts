import type {
	Command,
	CommandContext,
	CommandExecutionResult,
	CommandId,
} from './command.types'
import type { CommandRegistry } from './command-registry'

type CommandRuntimeOptions = {
	registry: CommandRegistry
	getContext: () => CommandContext
	onError?: (error: unknown, command: Command, ctx: CommandContext) => void
}

export class CommandRuntime {
	private readonly registry: CommandRegistry
	private readonly getContext: () => CommandContext
	private readonly onError?: (error: unknown, command: Command, ctx: CommandContext) => void

	constructor({ registry, getContext, onError }: CommandRuntimeOptions) {
		this.registry = registry
		this.getContext = getContext
		this.onError = onError
	}

	isVisible(command: Command, ctx: CommandContext) {
		return command.isVisible?.(ctx) ?? true
	}

	isEnabled(command: Command, ctx: CommandContext) {
		return command.isEnabled?.(ctx) ?? true
	}

	getPriority(command: Command, ctx: CommandContext) {
		return command.getPriority?.(ctx) ?? 0
	}

	getDisabledReason(command: Command, ctx: CommandContext) {
		return command.getDisabledReason?.(ctx)
	}

	getCommands() {
		return this.registry.getAll()
	}

	getCommandState(command: Command, ctx = this.getContext()) {
		const visible = this.isVisible(command, ctx)
		const enabled = visible && this.isEnabled(command, ctx)

		return {
			visible,
			enabled,
			disabledReason: enabled ? undefined : this.getDisabledReason(command, ctx),
			priority: this.getPriority(command, ctx),
		}
	}

	async execute(commandId: CommandId): Promise<CommandExecutionResult> {
		const command = this.registry.get(commandId)
		if (!command) {
			return { status: 'not-found', commandId }
		}

		const ctx = this.getContext()
		if (!this.isVisible(command, ctx)) {
			return { status: 'hidden', commandId }
		}

		if (!this.isEnabled(command, ctx)) {
			return {
				status: 'disabled',
				commandId,
				reason: this.getDisabledReason(command, ctx),
			}
		}

		// Runtime 不向 UI 抛业务错误，调用方只需要按执行结果决定提示和后续动作。
		try {
			await command.run(ctx)
			return { status: 'success', commandId }
		} catch (error) {
			this.onError?.(error, command, ctx)
			return { status: 'failed', commandId, error }
		}
	}
}
