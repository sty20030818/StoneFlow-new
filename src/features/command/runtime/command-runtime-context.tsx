import { createContext, useContext, type ReactNode } from 'react'

import type { CommandContext, CommandRuntime } from '@/features/command/core'

type CommandRuntimeContextValue = {
	runtime: CommandRuntime
	context: CommandContext
}

const CommandRuntimeContext = createContext<CommandRuntimeContextValue | null>(null)

/** 向命令消费表面暴露壳层唯一 Runtime 与当前基础 Context。 */
export function CommandRuntimeProvider({
	runtime,
	context,
	children,
}: CommandRuntimeContextValue & { children: ReactNode }) {
	return (
		<CommandRuntimeContext.Provider value={{ runtime, context }}>
			{children}
		</CommandRuntimeContext.Provider>
	)
}

export function useCommandRuntimeContext() {
	const value = useContext(CommandRuntimeContext)
	if (!value) {
		throw new Error('useCommandRuntimeContext must be used within CommandRuntimeProvider')
	}
	return value
}
