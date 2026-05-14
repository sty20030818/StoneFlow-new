import { COMMAND_IDS, type Command } from '@/features/command/core'

export const newCommands: Command[] = [
	{
		id: COMMAND_IDS.newQuickTask,
		title: '快速新建任务',
		category: 'new',
		scope: ['global'],
		description: '根据当前上下文快速创建任务。',
		keywords: ['task', 'create', 'new', 'quick', '任务'],
		// 批次一不接入 CreateDialog，避免提前改动用户可见行为。
		run: () => {},
	},
	{
		id: COMMAND_IDS.newFullTask,
		title: '完整新建任务',
		category: 'new',
		scope: ['global'],
		description: '打开完整任务创建流程。',
		keywords: ['task', 'create', 'full', '任务'],
		run: () => {},
	},
	{
		id: COMMAND_IDS.newTaskInInbox,
		title: '新建任务到收件箱',
		category: 'new',
		scope: ['global'],
		description: '强制将新任务创建到 Inbox。',
		keywords: ['task', 'create', 'inbox', '收件箱'],
		run: () => {},
	},
	{
		id: COMMAND_IDS.newProject,
		title: '新建项目',
		category: 'new',
		scope: ['global'],
		description: '打开新建项目弹窗。',
		keywords: ['project', 'create', 'new', '项目'],
		run: () => {},
	},
	{
		id: COMMAND_IDS.newView,
		title: '新建视图',
		category: 'new',
		scope: ['global'],
		description: '创建一个新的视图。',
		keywords: ['view', 'create', 'new', '视图'],
		run: () => {},
	},
]
