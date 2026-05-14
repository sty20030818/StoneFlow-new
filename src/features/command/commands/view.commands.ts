import { COMMAND_IDS, type Command } from '@/features/command/core'

export const viewCommands: Command[] = [
	{
		id: COMMAND_IDS.viewSuggestFilters,
		title: '建议视图筛选',
		category: 'view',
		scope: ['views-page'],
		description: '根据当前内容建议视图筛选条件。',
		keywords: ['view', 'filter', 'suggest', '视图', '筛选建议'],
		isEnabled: () => false,
		getDisabledReason: () => '视图建议命令尚未接入',
		run: () => {},
	},
]
