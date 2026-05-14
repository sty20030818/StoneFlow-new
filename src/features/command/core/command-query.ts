import type { Command, CommandContext } from './command.types'

export function getVisibleCommands(commands: Command[], ctx: CommandContext) {
	return commands.filter((command) => command.isVisible?.(ctx) ?? true)
}

export function sortCommandsByPriority(commands: Command[], ctx: CommandContext) {
	return [...commands].sort((left, right) => {
		const rightPriority = right.getPriority?.(ctx) ?? 0
		const leftPriority = left.getPriority?.(ctx) ?? 0
		return rightPriority - leftPriority
	})
}
