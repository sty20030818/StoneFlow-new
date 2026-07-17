import { LIFECYCLE_BULK_ACTION_IDS } from '@/features/bulk-action'
import type { CommandHostContext, ShellCommandActions } from '@/features/command'

/**
 * 向壳命令宿主注册归档/回收站多选 bulk handlers
 * （恢复 / 删除到回收站 / 永久删除）。
 */
export function registerLifecycleCommands(
	host: Pick<CommandHostContext, 'runEntityBulkActionFromCommand'>,
): Pick<
	ShellCommandActions,
	| 'restoreSelectedLifecycleEntries'
	| 'requestDeleteSelectedLifecycleEntries'
	| 'requestDeletePermanentlySelectedLifecycleEntries'
> {
	const run = host.runEntityBulkActionFromCommand
	return {
		restoreSelectedLifecycleEntries: (ctx) =>
			run(ctx, 'lifecycle', LIFECYCLE_BULK_ACTION_IDS.restoreSelected, {
				successVerb: '处理',
				entityLabel: '条目',
			}),
		requestDeleteSelectedLifecycleEntries: (ctx) =>
			run(ctx, 'lifecycle', LIFECYCLE_BULK_ACTION_IDS.deleteSelected, {
				successVerb: '处理',
				entityLabel: '条目',
			}),
		requestDeletePermanentlySelectedLifecycleEntries: (ctx) =>
			run(ctx, 'lifecycle', LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected, {
				successVerb: '处理',
				entityLabel: '条目',
			}),
	}
}
