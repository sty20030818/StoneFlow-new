import { COMMAND_IDS, type Keybinding } from '@/features/command/contract'

/**
 * 列表选择作用域的唯一快捷键声明。
 * 可展示动作显式标 primary；纯导航动作只参与匹配，不进入帮助或 Tooltip。
 */
export const SELECTION_SHORTCUT_BINDINGS: readonly Keybinding[] = [
	{
		commandId: COMMAND_IDS.selectionClear,
		sequence: [{ key: 'Escape' }],
		scope: 'list',
		display: 'primary',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.selectionSelectAll,
		sequence: [{ key: 'a', mod: true }],
		scope: 'list',
		display: 'primary',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.selectionFocusPrevious,
		sequence: [{ key: 'ArrowUp' }],
		scope: 'list',
		display: 'hidden',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.selectionFocusNext,
		sequence: [{ key: 'ArrowDown' }],
		scope: 'list',
		display: 'hidden',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.selectionExtendPrevious,
		sequence: [{ key: 'ArrowUp', shift: true }],
		scope: 'list',
		display: 'hidden',
		preventDefault: true,
		allowInEditable: false,
	},
	{
		commandId: COMMAND_IDS.selectionExtendNext,
		sequence: [{ key: 'ArrowDown', shift: true }],
		scope: 'list',
		display: 'hidden',
		preventDefault: true,
		allowInEditable: false,
	},
]
