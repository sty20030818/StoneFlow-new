import { COMMAND_IDS, type Command } from '@/features/command/core'

/**
 * 筛选命令：F 打开锚定 FilterMenu；清除/切换完成仍可走命令板。
 * 不再有 F→p/s/d/j 两段 chord（对齐 Linear：F 直接开菜单）。
 */
export const filterCommands: Command[] = [
	{
		id: COMMAND_IDS.filterAdd,
		title: '添加筛选',
		category: 'filter',
		scope: ['app'],
		description: '打开筛选菜单，添加或编辑筛选条件。',
		keywords: ['filter', 'add', '筛选', 'F'],
		getPriority: () => 50,
		run: () => {},
	},
	{
		id: COMMAND_IDS.filterToggleCompleted,
		title: '切换显示已完成',
		category: 'filter',
		scope: ['app'],
		description: '切换当前列表是否显示已完成任务。',
		keywords: ['filter', 'completed', 'done', '已完成'],
		getPriority: () => 30,
		run: () => {},
	},
	{
		id: COMMAND_IDS.filterClearAll,
		title: '清除全部筛选',
		category: 'filter',
		scope: ['app'],
		description: '清除当前列表的临时筛选条件。',
		keywords: ['filter', 'clear', 'reset', '清除筛选'],
		getPriority: () => 30,
		run: () => {},
	},
]
