export {
	createEmptyCommandContext,
	createEmptyCommandRowTargetContext,
	createEmptyCommandSelectionContext,
	resolveTaskDetailTargetId,
} from './command-context'
export { CommandRegistry } from './command-registry'
export { CommandRuntime } from './command-runtime'
export type { CommandProjection } from './command-runtime'
export { COMMAND_IDS } from './command.types'
export type {
	Command,
	CommandCategory,
	CommandContext,
	CommandExecutionResult,
	CommandFocusContext,
	CommandId,
	CommandInvocation,
	CommandInvocationSource,
	CommandProjectContext,
	CommandRouteContext,
	CommandRowTargetContext,
	CommandScope,
	CommandSelectedEntity,
	CommandSelectionContext,
	CommandSpaceContext,
	CommandSubmitContext,
	CommandUiContext,
	CommandViewContext,
	KnownCommandId,
} from './command.types'
export type { TaskPlacementTarget } from '@/features/task/contract'
