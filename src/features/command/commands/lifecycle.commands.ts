import { COMMAND_IDS, type Command } from '@/features/command/core'

const LIFECYCLE_SELECTION_DISABLED_REASON = '需要先选择归档或回收站条目'

function lifecycleCommand(command: Omit<Command, 'run' | 'isEnabled' | 'getDisabledReason'>): Command {
	return {
		...command,
		isEnabled: (ctx) => ctx.selection.type === 'lifecycle' && ctx.selection.ids.length > 0,
		getDisabledReason: (ctx) =>
			ctx.selection.type === 'lifecycle' && ctx.selection.ids.length > 0
				? undefined
				: LIFECYCLE_SELECTION_DISABLED_REASON,
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run: () => {},
	}
}

export const lifecycleCommands: Command[] = [
	lifecycleCommand({
		id: COMMAND_IDS.lifecycleRestore,
		title: '恢复',
		category: 'lifecycle',
		scope: ['task-list'],
		description: '恢复选中的归档或回收站条目。',
		keywords: ['restore', '恢复', 'archive', 'trash'],
	}),
	lifecycleCommand({
		id: COMMAND_IDS.lifecycleDelete,
		title: '删除',
		category: 'lifecycle',
		scope: ['task-list'],
		description: '将选中的归档条目移入回收站。',
		keywords: ['delete', 'trash', '删除', '回收站'],
		isVisible: (ctx) =>
			ctx.route.page === 'archive' &&
			ctx.selection.type === 'lifecycle' &&
			ctx.selection.hasSelection,
	}),
	lifecycleCommand({
		id: COMMAND_IDS.lifecycleDeletePermanently,
		title: '永久删除',
		category: 'lifecycle',
		scope: ['trash-page'],
		description: '永久删除选中的回收站条目。',
		keywords: ['delete', 'permanent', '永久删除', '回收站'],
		isVisible: (ctx) =>
			ctx.route.page === 'trash' &&
			ctx.selection.type === 'lifecycle' &&
			ctx.selection.hasSelection,
	}),
]
