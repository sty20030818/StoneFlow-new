import { CommandRegistry } from '@/features/command/core'
import { bindShellCommand, type ShellCommandAdapter } from '@/features/command/adapters'

import { generalCommands } from './general.commands'
import { navigationCommands } from './navigation.commands'
import { newCommands } from './new.commands'
import { openCommands } from './open.commands'

export const allCommands = [
	...generalCommands,
	...openCommands,
	...newCommands,
	...navigationCommands,
]

export const commandRegistry = new CommandRegistry(allCommands)

export function createShellCommandRegistry(adapter: ShellCommandAdapter) {
	return new CommandRegistry(allCommands.map((command) => bindShellCommand(command, adapter)))
}

export { generalCommands } from './general.commands'
export { navigationCommands } from './navigation.commands'
export { newCommands } from './new.commands'
export { openCommands } from './open.commands'
