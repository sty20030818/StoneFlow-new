import { CommandRegistry } from '@/features/command/core'
import { bindShellCommand, type ShellCommandAdapter } from '@/features/command/adapters'

import { filterCommands } from './filter.commands'
import { generalCommands } from './general.commands'

import { layoutCommands } from './layout.commands'
import { lifecycleCommands } from './lifecycle.commands'
import { navigationCommands } from './navigation.commands'
import { newCommands } from './new.commands'
import { openCommands } from './open.commands'
import { projectCommands } from './project.commands'
import { systemCommands } from './system.commands'
import { taskCommands } from './task.commands'
import { viewCommands } from './view.commands'

export const allCommands = [
	...generalCommands,
	...openCommands,
	...newCommands,
	...navigationCommands,
	...taskCommands,
	...projectCommands,
	...filterCommands,
	...layoutCommands,
	...lifecycleCommands,
	...systemCommands,
	...viewCommands,
]

export function createShellCommandRegistry(adapter: ShellCommandAdapter) {
	return new CommandRegistry(allCommands.map((command) => bindShellCommand(command, adapter)))
}

export { filterCommands } from './filter.commands'
export { generalCommands } from './general.commands'
export { layoutCommands } from './layout.commands'
export { lifecycleCommands } from './lifecycle.commands'
export { navigationCommands } from './navigation.commands'
export { newCommands } from './new.commands'
export { openCommands } from './open.commands'
export { projectCommands } from './project.commands'
export { systemCommands } from './system.commands'
export { taskCommands } from './task.commands'
export { viewCommands } from './view.commands'
