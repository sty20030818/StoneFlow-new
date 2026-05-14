import { COMMAND_IDS, type Command } from '@/features/command/core'

export const inboxCommands: Command[] = [
	{
		id: COMMAND_IDS.inboxClean,
		title: '清理收件箱',
		category: 'inbox',
		scope: ['inbox-page'],
		description: '清理或整理 Inbox 中的任务。',
		keywords: ['inbox', 'clean', '整理', '收件箱'],
		isEnabled: () => false,
		getDisabledReason: () => 'Inbox 清理命令尚未接入',
		run: () => {},
	},
]
