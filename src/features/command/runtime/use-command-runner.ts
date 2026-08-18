import { useCallback } from 'react'

import type {
	CommandExecutionResult,
	CommandId,
	CommandInvocation,
	CommandRuntime,
} from '@/features/command/core'

type UseCommandRunnerOptions = {
	runtime: CommandRuntime
	onResult?: (result: CommandExecutionResult) => void
}

export function useCommandRunner({ runtime, onResult }: UseCommandRunnerOptions) {
	return useCallback(
		async (commandId: CommandId, invocation: CommandInvocation) => {
			const result = await runtime.execute(commandId, invocation)
			onResult?.(result)
			return result
		},
		[onResult, runtime],
	)
}
