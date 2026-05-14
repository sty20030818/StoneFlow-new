import { COMMAND_IDS, type Command } from '@/features/command/core'

const PROJECT_COMMAND_DISABLED_REASON = '项目命令尚未接入'

function disabledCommand(command: Omit<Command, 'run' | 'isEnabled' | 'getDisabledReason'>): Command {
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
	disabledCommand({
		id: COMMAND_IDS.projectArchive,
		title: '归档项目',
		category: 'project',
		scope: ['project-page', 'project-list'],
		description: '归档当前项目。',
		keywords: ['project', 'archive', '归档'],
		getPriority: () => 40,
	}),
]
