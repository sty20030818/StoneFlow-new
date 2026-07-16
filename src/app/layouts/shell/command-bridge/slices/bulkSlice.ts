import type { ShellCommandActions } from '@/features/command'
import {
	LIFECYCLE_BULK_ACTION_IDS,
	PROJECT_BULK_ACTION_IDS,
	TASK_BULK_ACTION_IDS,
} from '@/features/bulk-action'
import type { ShellCommandBridgeDeps } from '../types'

/** 批量完成/归档/删除（task / project / lifecycle） */
export function createBulkSlice(
	deps: Pick<ShellCommandBridgeDeps, 'runEntityBulkActionFromCommand'>,
): Partial<ShellCommandActions> {
	const run = deps.runEntityBulkActionFromCommand
	return {
		completeSelectedTasks: (ctx) =>
			run(ctx, 'task', TASK_BULK_ACTION_IDS.completeSelected, {
				successVerb: '更新',
				entityLabel: '任务',
			}),
		requestArchiveSelectedTasks: (ctx) =>
			run(ctx, 'task', TASK_BULK_ACTION_IDS.archiveSelected, {
				successVerb: '更新',
				entityLabel: '任务',
			}),
		requestDeleteSelectedTasks: (ctx) =>
			run(ctx, 'task', TASK_BULK_ACTION_IDS.deleteSelected, {
				successVerb: '更新',
				entityLabel: '任务',
			}),
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
