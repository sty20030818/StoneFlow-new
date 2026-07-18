/**
 * command 域对外公共面（`@/features/command`）。
 *
 * @remarks
 * 外模块只能从此文件导入；禁止深路径进 core/components/keybinding。
 * 负责：Registry/Runtime、快捷键、菜单 UI、Host 端口类型、壳 adapter 形状。
 * 不负责：各域 mutation；layout 只装配 Host。
 */

// ── Core ────────────────────────────────────────────────────────────────────

export {
	createEmptyCommandContext,
	createEmptyCommandSelectionContext,
	CommandRegistry,
	CommandRuntime,
	COMMAND_IDS,
} from './core'

export type {
	Command,
	CommandContext,
	CommandFocusContext,
	CommandId,
	CommandRouteContext,
	CommandRowTargetContext,
	CommandSelectedEntity,
	CommandSelectionContext,
	TaskPlacementTarget,
} from './core'

// ── Keybinding ──────────────────────────────────────────────────────────────

export { DEFAULT_KEYBINDINGS, matchKeybindingEvent } from './keybinding'

export type {
	Keybinding,
	KeybindingChordState,
	KeybindingScope,
	NormalizedKeyEvent,
} from './keybinding'

// ── Runtime hooks ───────────────────────────────────────────────────────────

export { useCommandContext, useCommandRunner, useCommandRuntime } from './runtime'

// ── Shortcuts ───────────────────────────────────────────────────────────────

/**
 * 全局快捷键层与快捷键展示 tokens。
 */
export { CommandShortcutLayer, getCommandShortcutTokens } from './shortcuts'

export type { CommandChordSession } from './shortcuts'

// ── UI ──────────────────────────────────────────────────────────────────────

export { ChordHint, CommandMenu, ShortcutTokens, ShortcutHelp } from './components'

export type { CommandMenuMode } from './components'

// ── Shell adapter 形状（供 layout compose / 各域 register）──────────────────

export type { ShellCommandActions } from './adapters'

// ── IPC · 外部/唤起打开意图 ─────────────────────────────────────────────────

export { takePendingCommandOpenIntent } from './api/commandOpenIntent'

// ── 命令宿主端口（供各域 registerXxxCommands）───────────────────────────────

export type { CommandHostContext } from './host'
