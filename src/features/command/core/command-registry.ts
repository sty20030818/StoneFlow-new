import type { Command, CommandCategory, CommandId } from './command.types'

export class CommandRegistry {
	private readonly commands = new Map<CommandId, Command>()

	constructor(commands: Command[] = []) {
		this.registerMany(commands)
	}

	register(command: Command) {
		// CommandId 是命令系统的事实源，重复 id 必须在注册时直接暴露。
		if (this.commands.has(command.id)) {
			throw new Error(`Duplicate command id: ${command.id}`)
		}

		this.commands.set(command.id, command)
	}

	registerMany(commands: Command[]) {
		for (const command of commands) {
			this.register(command)
		}
	}

	get(commandId: CommandId) {
		return this.commands.get(commandId) ?? null
	}

	getAll() {
		return Array.from(this.commands.values())
	}

	getByCategory(category: CommandCategory) {
		return this.getAll().filter((command) => command.category === category)
	}
}
