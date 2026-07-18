/**
 * @fileoverview **command · 唯一对外公共面（`@/features/command`）**
 *
 * 命令注册表、快捷键、菜单 UI、壳 adapter。外层装配 Runtime / ShortcutLayer / CommandMenu。
 *
 * 外模块：`import { … } from '@/features/command'`
 * 禁止：`@/features/command/core|components|keybinding|…`
 *
 * public 只保留外模块已消费的符号；keybinding/菜单内部工具留在子路径自用。
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
	CommandCategory,
	CommandContext,
	CommandExecutionResult,
	CommandFocusContext,
	CommandId,
	CommandProjectContext,
	CommandRouteContext,
	CommandRowTargetContext,
	CommandScope,
	CommandSelectedEntity,
	CommandSelectionContext,
	CommandSpaceContext,
	CommandSubmitContext,
	CommandUiContext,
	CommandViewContext,
	KnownCommandId,
	TaskPlacementTarget,
} from './core'

// ── Keybinding ──────────────────────────────────────────────────────────────

export { DEFAULT_KEYBINDINGS, matchKeybindingEvent } from './keybinding'

export type {
	Keybinding,
	KeybindingChordState,
	KeybindingConflict,
	KeybindingKey,
	KeybindingMatchResult,
	KeybindingScope,
	KeybindingSequence,
	KeybindingStroke,
	NormalizedKeyEvent,
	ShortcutToken,
} from './keybinding'

// ── Runtime hooks ───────────────────────────────────────────────────────────

export { useCommandContext, useCommandRunner, useCommandRuntime } from './runtime'

// ── Shortcuts ───────────────────────────────────────────────────────────────

export { CommandShortcutLayer, getCommandShortcutTokens } from './shortcuts'

export type { CommandChordSession, ChordHintOption } from './shortcuts'

// ── UI ──────────────────────────────────────────────────────────────────────

export { ChordHint, CommandMenu, ShortcutTokens, ShortcutHelp } from './components'

export type {
	CommandMenuProject,
	CommandMenuMode,
	CommandMenuEntry,
	CommandMenuGroup,
	CommandMenuGroupKey,
	ShortcutHelpEntry,
	ShortcutHelpGroup,
} from './components'

// ── Shell adapter ───────────────────────────────────────────────────────────

export type { ShellCommandActions, ShellCommandAdapter, ShellNavigationTarget } from './adapters'

// ── IPC · 外部/唤起打开意图 ─────────────────────────────────────────────────

export { takePendingCommandOpenIntent } from './api/commandOpenIntent'

// ── 命令宿主端口（供各域 registerXxxCommands 使用）────────────────────────

export type { CommandHostContext } from './host'
