import { COMMAND_IDS, type Command } from '@/features/command/core'

export const layoutCommands: Command[] = [
	{
		id: COMMAND_IDS.layoutToggleSidebar,
		title: '切换侧边栏',
		category: 'layout',
		scope: ['global'],
		description: '展开或收起左侧边栏。',
		keywords: ['layout', 'sidebar', 'toggle', '侧边栏'],
		getPriority: () => 50,
		run: () => {},
	},
	{
		id: COMMAND_IDS.layoutTogglePreview,
		title: '切换任务详情',
		category: 'layout',
		scope: ['global'],
		description: '展开或收起右侧任务详情面板。',
		keywords: ['layout', 'preview', 'detail', 'toggle', '预览', '详情'],
		getPriority: () => 40,
		run: () => {},
	},
]
