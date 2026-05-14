import { COMMAND_IDS, type Command } from '@/features/command/core'

export const newCommands: Command[] = [
	{
		id: COMMAND_IDS.newTask,
		title: '新建任务',
		category: 'new',
		scope: ['global'],
		description: '打开普通新建任务弹窗。',
		keywords: ['task', 'create', 'new', '任务'],
		// 批次一不接入 CreateDialog，避免提前改动用户可见行为。
		run: () => {},
	},
	{
		id: COMMAND_IDS.newTaskFullscreen,
		title: '全屏新建任务',
		category: 'new',
		scope: ['global'],
		description: '以全屏形态打开新建任务弹窗。',
		keywords: ['task', 'fullscreen', 'create', '任务'],
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
]
