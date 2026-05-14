import { COMMAND_IDS, type Command } from '@/features/command/core'

const FILTER_COMMAND_DISABLED_REASON = '筛选命令尚未接入'

function disabledCommand(command: Omit<Command, 'run' | 'isEnabled' | 'getDisabledReason'>): Command {
	return {
		...command,
		isEnabled: () => false,
		getDisabledReason: () => FILTER_COMMAND_DISABLED_REASON,
		run: () => {},
	}
}

export const filterCommands: Command[] = [
	disabledCommand({
		id: COMMAND_IDS.filterAdd,
		title: '添加筛选',
		category: 'filter',
		scope: ['app'],
		description: '添加一个新的筛选条件。',
		keywords: ['filter', 'add', '筛选'],
		getPriority: () => 50,
	}),
	disabledCommand({
		id: COMMAND_IDS.filterByPriority,
		title: '按优先级筛选',
		category: 'filter',
		scope: ['app'],
		description: '按任务优先级筛选当前列表。',
		keywords: ['filter', 'priority', '筛选', '优先级'],
		getPriority: () => 40,
	}),
	disabledCommand({
		id: COMMAND_IDS.filterByStatus,
		title: '按状态筛选',
		category: 'filter',
		scope: ['app'],
		description: '按任务状态筛选当前列表。',
		keywords: ['filter', 'status', '筛选', '状态'],
		getPriority: () => 40,
	}),
	disabledCommand({
		id: COMMAND_IDS.filterByDate,
		title: '按日期筛选',
		category: 'filter',
		scope: ['app'],
		description: '按日期筛选当前列表。',
		keywords: ['filter', 'date', '筛选', '日期'],
		getPriority: () => 40,
	}),
	disabledCommand({
		id: COMMAND_IDS.filterByProject,
		title: '按项目筛选',
		category: 'filter',
		scope: ['app'],
		description: '按项目筛选当前列表。',
		keywords: ['filter', 'project', '筛选', '项目'],
		getPriority: () => 40,
	}),
	disabledCommand({
		id: COMMAND_IDS.filterToggleCompleted,
		title: '切换显示已完成',
		category: 'filter',
		scope: ['app'],
		description: '切换当前列表是否显示已完成任务。',
		keywords: ['filter', 'completed', 'done', '已完成'],
		getPriority: () => 30,
	}),
	disabledCommand({
		id: COMMAND_IDS.filterClearAll,
		title: '清除全部筛选',
		category: 'filter',
		scope: ['app'],
		description: '清除当前列表的所有筛选条件。',
		keywords: ['filter', 'clear', 'reset', '清除筛选'],
		getPriority: () => 30,
	}),
]
