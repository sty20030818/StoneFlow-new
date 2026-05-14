import { useMemo } from 'react'

import {
	CommandRuntime,
	type CommandContext,
	type CommandExecutionResult,
} from '@/features/command/core'
import {
	createShellCommandAdapter,
	type ShellCommandActions,
} from '@/features/command/adapters'
import { createShellCommandRegistry } from '@/features/command/commands'

type UseCommandRuntimeOptions = {
	actions: ShellCommandActions
	context: CommandContext
	onError?: (result: Extract<CommandExecutionResult, { status: 'failed' }>) => void
}

export function useCommandRuntime({ actions, context, onError }: UseCommandRuntimeOptions) {
	const registry = useMemo(() => {
		const adapter = createShellCommandAdapter(actions)
		return createShellCommandRegistry(adapter)
	}, [actions])

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
