import { COMMAND_IDS, type Command } from '@/features/command/core'

export const systemCommands: Command[] = [
	{
		id: COMMAND_IDS.systemOpenDataFolder,
		title: '打开数据文件夹',
		category: 'system',
		scope: ['global'],
		description: '在系统文件管理器中打开 StoneFlow 数据目录。',
		keywords: ['system', 'data', 'folder', '系统', '数据文件夹'],
		isEnabled: () => false,
		getDisabledReason: () => '系统命令尚未接入',
		run: () => {},
	},
]
