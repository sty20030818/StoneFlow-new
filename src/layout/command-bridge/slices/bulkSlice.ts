import type { ShellCommandActions } from '@/features/command'
import { LIFECYCLE_BULK_ACTION_IDS, PROJECT_BULK_ACTION_IDS } from '@/features/bulk-action'
import { registerTaskCommands } from '@/features/task'
import type { ShellCommandBridgeDeps } from '../types'

/**
 * 批量完成/归档/删除。
 * task 段：C3 试点 — 转发给 task.registerTaskCommands（业务在 domain）。
 * project/lifecycle：史诗 6 再迁。
 */
export function createBulkSlice(
	deps: Pick<ShellCommandBridgeDeps, 'runEntityBulkActionFromCommand'>,
): Partial<ShellCommandActions> {
	const run = deps.runEntityBulkActionFromCommand
	return {
		...registerTaskCommands({ runEntityBulkActionFromCommand: run }),
		requestArchiveSelectedProjects: (ctx) =>
			run(ctx, 'project', PROJECT_BULK_ACTION_IDS.archiveSelected, {
				successVerb: '处理',
				entityLabel: '项目',
			}),
		requestDeleteSelectedProjects: (ctx) =>
			run(ctx, 'project', PROJECT_BULK_ACTION_IDS.deleteSelected, {
				successVerb: '处理',
				entityLabel: '项目',
			}),
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
