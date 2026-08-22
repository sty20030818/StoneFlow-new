import { COMMAND_IDS, type Command } from '@/features/command/core'

/**
 * 筛选命令：F 打开锚定 FilterMenu；清除可走命令板。
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
		id: COMMAND_IDS.filterClearAll,
		title: '恢复当前视图',
		category: 'filter',
		scope: ['app'],
		description: '删除临时筛选，恢复当前视图保存的条件。',
		keywords: ['filter', 'clear', 'reset', '恢复视图', '清除临时筛选'],
		getPriority: () => 30,
		run: () => {},
	},
]
