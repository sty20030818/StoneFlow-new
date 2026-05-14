import { COMMAND_IDS, type Command } from '@/features/command/core'

export const generalCommands: Command[] = [
	{
		id: COMMAND_IDS.openCommandMenu,
		title: '打开命令菜单',
		category: 'general',
		scope: ['global'],
		description: '打开 StoneFlow 的全局命令入口。',
		keywords: ['command', 'cmdk', '命令'],
		// 批次一只建立注册表数据；真实 Shell 行为在后续批次通过 adapter 注入。
		run: () => {},
	},
	{
		id: COMMAND_IDS.openSearch,
		title: '打开搜索',
		category: 'general',
		scope: ['global'],
		description: '聚焦全局搜索框。',
		keywords: ['search', 'find', '搜索'],
		run: () => {},
	},
]
