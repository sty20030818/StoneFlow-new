import type { CommandContext } from '@/features/command/core'
import type {
	BulkActionId,
	BulkActionPayload,
	BulkActionResultMessageLabels,
	BulkEntityType,
} from '@/features/bulk-action'

/**
 * 壳宿主提供给域 `registerXxxCommands` 的端口（C3）。
 * 试点只含 bulk 执行；史诗 6 再扩 navigate / dialog / filter 等。
 */
export type CommandHostContext = {
	runEntityBulkActionFromCommand: (
		ctx: CommandContext,
		entity: BulkEntityType,
		actionId: BulkActionId,
		labels: BulkActionResultMessageLabels,
		payload?: BulkActionPayload,
	) => Promise<void>
}
