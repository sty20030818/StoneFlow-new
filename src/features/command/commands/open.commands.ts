import { COMMAND_IDS, type Command } from '@/features/command/core'

export const openCommands: Command[] = [
	{
		id: COMMAND_IDS.openTask,
		title: '打开任务',
		category: 'open',
		scope: ['global'],
		description: '在命令菜单中搜索并打开任务。',
		keywords: ['open', 'task', 'search', '任务'],
		run: () => {},
	},
	{
		id: COMMAND_IDS.openProject,
		title: '打开项目',
		category: 'open',
		scope: ['global'],
		description: '在命令菜单中搜索并打开项目。',
		keywords: ['open', 'project', 'search', '项目'],
		run: () => {},
	},
	{
		id: COMMAND_IDS.openView,
		title: '打开视图',
		category: 'open',
		scope: ['global'],
		description: '搜索并打开视图。',
		keywords: ['open', 'view', 'search', '视图'],
		run: () => {},
	},
	{
		id: COMMAND_IDS.openSpace,
		title: '打开 Space',
		category: 'open',
		scope: ['global'],
		description: '搜索并切换 Space。',
		keywords: ['open', 'space', 'search'],
		run: () => {},
	},
	{
		id: COMMAND_IDS.openRecent,
		title: '打开最近访问',
		category: 'open',
		scope: ['global'],
		description: '打开最近访问选择器。',
		keywords: ['open', 'recent', 'history', '最近'],
		run: () => {},
	},
]
