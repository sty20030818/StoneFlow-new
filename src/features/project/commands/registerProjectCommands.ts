import { PROJECT_BULK_ACTION_IDS } from '@/features/bulk-action'
import type { CommandHostContext, ShellCommandActions } from '@/features/command'

/**
 * 向壳命令宿主注册项目多选 bulk handlers（归档 / 删除）。
 * 与列表页 BulkActionBar 共用同一套 PROJECT_BULK_ACTION_IDS。
 */
export function registerProjectCommands(
	host: Pick<CommandHostContext, 'runEntityBulkActionFromCommand'>,
): Pick<ShellCommandActions, 'requestArchiveSelectedProjects' | 'requestDeleteSelectedProjects'> {
	const run = host.runEntityBulkActionFromCommand
	return {
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
	}
}
