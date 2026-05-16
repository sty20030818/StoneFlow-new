import { useCallback } from 'react'

import type { CommandExecutionResult, CommandId, CommandRuntime } from '@/features/command/core'

type UseCommandRunnerOptions = {
	runtime: CommandRuntime
	onResult?: (result: CommandExecutionResult) => void
}

export function useCommandRunner({ runtime, onResult }: UseCommandRunnerOptions) {
	return useCallback(
		async (commandId: CommandId) => {
			const result = await runtime.execute(commandId)
			onResult?.(result)
			return result
		},
		[onResult, runtime],
	)
}
