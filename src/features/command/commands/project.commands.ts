import { COMMAND_IDS, type Command } from '@/features/command/core'

const PROJECT_COMMAND_DISABLED_REASON = '项目命令尚未接入'
const PROJECT_SELECTION_DISABLED_REASON = '需要先选择项目'

function disabledCommand(
	command: Omit<Command, 'run' | 'isEnabled' | 'getDisabledReason'>,
): Command {
	return {
		...command,
		isEnabled: () => false,
		getDisabledReason: () => PROJECT_COMMAND_DISABLED_REASON,
		run: () => {},
	}
}

export const projectCommands: Command[] = [
	disabledCommand({
		id: COMMAND_IDS.projectRename,
		title: '重命名项目',
		category: 'project',
		scope: ['project-page', 'project-list'],
		description: '重命名当前项目。',
		keywords: ['project', 'rename', 'edit', '重命名'],
		getPriority: () => 50,
	}),
	projectSelectionCommand({
		id: COMMAND_IDS.projectArchive,
		title: '归档项目',
		category: 'project',
		scope: ['project-page', 'project-list'],
		description: '归档当前项目。',
		keywords: ['project', 'archive', '归档'],
		getPriority: () => 40,
	}),
	projectSelectionCommand({
		id: COMMAND_IDS.projectDelete,
		title: '删除项目',
		category: 'project',
		scope: ['project-list'],
		description: '删除选中的项目。',
		keywords: ['project', 'delete', 'trash', '删除', '回收站'],
		getPriority: () => 40,
	}),
]

function projectSelectionCommand(
	command: Omit<Command, 'run' | 'isEnabled' | 'getDisabledReason'>,
): Command {
	return {
		...command,
		isEnabled: (ctx) => ctx.selection.type === 'project' && ctx.selection.ids.length > 0,
		getDisabledReason: (ctx) =>
			ctx.selection.type === 'project' && ctx.selection.ids.length > 0
				? undefined
				: PROJECT_SELECTION_DISABLED_REASON,
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run: () => {},
	}
}
