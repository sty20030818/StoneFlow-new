import { COMMAND_IDS } from '@/features/command/core'
import type { Keybinding } from '@/features/command/keybinding'

export const TASK_ROW_SHORTCUT_BINDINGS: Keybinding[] = [
	{
		commandId: COMMAND_IDS.taskComplete,
		sequence: [{ key: 'w' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskSelect,
		sequence: [{ key: 'x' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskPeek,
		sequence: [{ key: 'Space' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskOpenDetail,
		sequence: [{ key: 'Enter' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskArchive,
		sequence: [{ key: 'a' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskDelete,
		sequence: [{ key: 'Delete' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskDelete,
		sequence: [{ key: 'Backspace', meta: true }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskDelete,
		sequence: [{ key: 'Backspace', ctrl: true }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskSetPriority,
		sequence: [{ key: 'p' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskSetStatus,
		sequence: [{ key: 's' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskOpenDateMenu,
		sequence: [{ key: 'd' }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.taskChangePlacement,
		sequence: [{ key: 'p', shift: true }],
		scope: 'row',
		preventDefault: true,
		allowInEditable: false,
	},
]
