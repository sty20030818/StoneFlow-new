import { COMMAND_IDS, type Command } from '@/features/command/core'

const ROW_CONTEXT_DISABLED_REASON = 'Row 上下文尚未接入'
const ROW_MENU_DISABLED_REASON = 'Row 菜单快捷操作尚未接入'

function disabledCommand(
	command: Omit<Command, 'run' | 'isEnabled' | 'getDisabledReason'>,
	reason: string,
): Command {
	return {
		...command,
		isEnabled: () => false,
		getDisabledReason: () => reason,
		run: () => {},
	}
}

export const taskCommands: Command[] = [
	disabledCommand(
		{
			id: COMMAND_IDS.taskComplete,
			title: '完成任务',
			category: 'task',
			scope: ['task-list'],
			description: '完成或取消完成当前任务。',
			keywords: ['task', 'complete', 'done', '完成'],
			getPriority: () => 80,
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskSelect,
			title: '选择任务',
			category: 'task',
			scope: ['task-list'],
			description: '选择当前任务行。',
			keywords: ['task', 'select', '选择'],
			getPriority: () => 70,
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskPeek,
			title: '预览任务',
			category: 'task',
			scope: ['task-list'],
			description: '预览当前任务。',
			keywords: ['task', 'peek', 'preview', '预览'],
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskOpenDetail,
			title: '打开任务详情',
			category: 'task',
			scope: ['task-list'],
			description: '打开当前任务详情。',
			keywords: ['task', 'detail', 'open', '详情'],
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskRename,
			title: '重命名任务',
			category: 'task',
			scope: ['task-list'],
			description: '重命名当前任务。',
			keywords: ['task', 'rename', 'edit', '重命名'],
			getPriority: () => 60,
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskSetPriority,
			title: '设置任务优先级',
			category: 'task',
			scope: ['task-list'],
			description: '打开当前任务的优先级菜单。',
			keywords: ['task', 'priority', '优先级'],
			getPriority: () => 50,
		},
		ROW_MENU_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskSetStatus,
			title: '设置任务状态',
			category: 'task',
			scope: ['task-list'],
			description: '打开当前任务的状态菜单。',
			keywords: ['task', 'status', '状态'],
			getPriority: () => 50,
		},
		ROW_MENU_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskOpenDateMenu,
			title: '设置任务日期',
			category: 'task',
			scope: ['task-list'],
			description: '打开当前任务的日期菜单。',
			keywords: ['task', 'date', 'due', '日期'],
			getPriority: () => 50,
		},
		ROW_MENU_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskArchive,
			title: '归档任务',
			category: 'task',
			scope: ['task-list'],
			description: '归档当前任务。',
			keywords: ['task', 'archive', '归档'],
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskDelete,
			title: '删除任务',
			category: 'task',
			scope: ['task-list'],
			description: '删除当前任务。',
			keywords: ['task', 'delete', 'trash', '删除'],
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskConvertToProject,
			title: '任务转为项目',
			category: 'task',
			scope: ['task-list'],
			description: '将当前任务转换为项目。',
			keywords: ['task', 'project', 'convert', '转换'],
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	disabledCommand(
		{
			id: COMMAND_IDS.taskCreateProjectFromTask,
			title: '从任务创建项目',
			category: 'task',
			scope: ['task-list'],
			description: '基于当前任务创建项目。',
			keywords: ['task', 'project', 'create', '创建项目'],
		},
		ROW_CONTEXT_DISABLED_REASON,
	),
	{
		id: COMMAND_IDS.taskChangePlacement,
		title: '移动到...',
		category: 'move',
		scope: ['task-list'],
		description: '打开任务放置 scoped picker，选择目标项目或独立事项。',
		keywords: ['task', 'move', 'placement', 'project', '独立事项', '移动', '项目'],
		getPriority: () => 40,
		run: () => {},
	},
]
