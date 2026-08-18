import type {
	Command,
	CommandContext,
	CommandExecutionResult,
	CommandId,
	CommandInvocation,
} from './command.types'
import type { CommandRegistry } from './command-registry'

type CommandRuntimeOptions = {
	registry: CommandRegistry
	getContext: () => CommandContext
	onError?: (error: unknown, command: Command, ctx: CommandContext) => void
}

export type CommandProjection = {
	id: CommandId
	label: string
	category: Command['category']
	scope: Command['scope']
	icon?: string
	description?: string
	keywords?: string[]
	visible: boolean
	enabled: boolean
	disabledReason?: string
	priority: number
	target: CommandContext
	execute: (invocation: CommandInvocation) => Promise<CommandExecutionResult>
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

	project(commandId: CommandId, target = this.getContext()): CommandProjection | null {
		const command = this.registry.get(commandId)
		return command ? this.createProjection(command, target) : null
	}

	projectAll(target = this.getContext()): CommandProjection[] {
		return this.registry.getAll().map((command) => this.createProjection(command, target))
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

	async execute(
		commandId: CommandId,
		invocation: CommandInvocation,
		ctx = this.getContext(),
	): Promise<CommandExecutionResult> {
		const command = this.registry.get(commandId)
		if (!command) {
			return { status: 'not-found', commandId }
		}

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
			await command.run(ctx, invocation)
			return { status: 'success', commandId }
		} catch (error) {
			this.onError?.(error, command, ctx)
			return { status: 'failed', commandId, error }
		}
	}

	private createProjection(command: Command, target: CommandContext): CommandProjection {
		const state = this.getCommandState(command, target)
		return {
			id: command.id,
			label: command.title,
			category: command.category,
			scope: command.scope,
			icon: command.icon,
			description: command.description,
			keywords: command.keywords,
			...state,
			target,
			execute: (invocation) => this.execute(command.id, invocation, target),
		}
	}
}
