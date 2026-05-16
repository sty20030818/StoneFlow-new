import { COMMAND_IDS, type Command } from '@/features/command/core'

const LAYOUT_COMMAND_DISABLED_REASON = '布局命令尚未接入'

function disabledCommand(
	command: Omit<Command, 'run' | 'isEnabled' | 'getDisabledReason'>,
): Command {
	return {
		...command,
		isEnabled: () => false,
		getDisabledReason: () => LAYOUT_COMMAND_DISABLED_REASON,
		run: () => {},
	}
}

export const layoutCommands: Command[] = [
	disabledCommand({
		id: COMMAND_IDS.layoutToggleSidebar,
		title: '切换侧边栏',
		category: 'layout',
		scope: ['global'],
		description: '展开或收起左侧边栏。',
		keywords: ['layout', 'sidebar', 'toggle', '侧边栏'],
		getPriority: () => 50,
	}),
	disabledCommand({
		id: COMMAND_IDS.layoutTogglePreview,
		title: '切换预览面板',
		category: 'layout',
		scope: ['global'],
		description: '展开或收起预览面板。',
		keywords: ['layout', 'preview', 'toggle', '预览'],
		getPriority: () => 40,
	}),
]
