import { COMMAND_IDS, type Command } from '@/features/command/core'

/** 显示选项：Shift+F 打开锚定 Display 面板（对齐 Linear）。 */
export const displayCommands: Command[] = [
	{
		id: COMMAND_IDS.displayOpenOptions,
		title: '显示选项',
		category: 'layout',
		scope: ['app'],
		description: '打开显示选项（分组、排序、完成可见性、字段）。',
		keywords: ['display', 'view', '显示', '分组', '排序', 'Shift+F'],
		getPriority: () => 45,
		run: () => {},
	},
]
