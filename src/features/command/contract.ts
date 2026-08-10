/**
 * command 的纯契约面：供其它 feature 声明命令与快捷键，不加载 React/UI barrel。
 */
export { COMMAND_IDS } from './core/command.types'
export type { CommandId, KnownCommandId } from './core/command.types'
export type {
	Keybinding,
	KeybindingDisplay,
	KeybindingScope,
	KeybindingSequence,
	KeybindingStroke,
	NormalizedKeyEvent,
} from './keybinding/keybinding.types'
