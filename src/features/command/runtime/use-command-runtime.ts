import { useMemo } from 'react'

import {
	CommandRuntime,
	type CommandContext,
	type CommandExecutionResult,
} from '@/features/command/core'
import type { ShellCommandAdapter } from '@/features/command/adapters'
import { createShellCommandRegistry } from '@/features/command/commands'

type UseCommandRuntimeOptions = {
	actions: ShellCommandAdapter
	context: CommandContext
	onError?: (result: Extract<CommandExecutionResult, { status: 'failed' }>) => void
}

export function useCommandRuntime({ actions, context, onError }: UseCommandRuntimeOptions) {
	const registry = useMemo(() => createShellCommandRegistry(actions), [actions])

	return useMemo(
		() =>
			new CommandRuntime({
				registry,
				getContext: () => context,
				onError: (error, command) => {
					onError?.({ status: 'failed', commandId: command.id, error })
				},
			}),
		[context, onError, registry],
	)
}
