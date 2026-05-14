import { CommandRegistry } from '@/features/command/core'

import { generalCommands } from './general.commands'
import { navigationCommands } from './navigation.commands'
import { newCommands } from './new.commands'

export const allCommands = [
	...generalCommands,
	...newCommands,
	...navigationCommands,
]

export const commandRegistry = new CommandRegistry(allCommands)

export { generalCommands } from './general.commands'
export { navigationCommands } from './navigation.commands'
export { newCommands } from './new.commands'
