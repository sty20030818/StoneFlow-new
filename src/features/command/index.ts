/**
 * @fileoverview **command · 唯一对外公共面（`@/features/command`）**
 *
 * 命令注册表、快捷键、菜单 UI、壳 adapter。外层装配 Runtime / ShortcutLayer / CommandMenu。
 *
 * 外模块：`import { … } from '@/features/command'`
 * 禁止：`@/features/command/core|components|keybinding|…`
 */

// ── Core ────────────────────────────────────────────────────────────────────

export {
	createEmptyCommandContext,
	createEmptyCommandRowTargetContext,
	createEmptyCommandSelectionContext,
	CommandRegistry,
	CommandRuntime,
	getVisibleCommands,
	sortCommandsByPriority,
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

export {
	DEFAULT_KEYBINDINGS,
	areStrokesEqual,
	isChordExpired,
	KEYBINDING_CHORD_TIMEOUT_MS,
	matchKeybindingEvent,
	normalizeKeybindingStroke,
	KeybindingRegistry,
	formatKeybindingSequence,
	formatKeybindingStroke,
	tokenizeKeybindingSequence,
	tokenizeKeybindingStroke,
	isEditableTarget,
	shouldIgnoreKeybindingEvent,
} from './keybinding'

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

export {
	CommandShortcutLayer,
	buildChordSession,
	getCommandShortcutDisplay,
	getCommandShortcutTokens,
	useCommandShortcuts,
} from './shortcuts'

export type { CommandChordSession, ChordHintOption } from './shortcuts'

// ── UI ──────────────────────────────────────────────────────────────────────

export {
	ChordHint,
	CommandMenu,
	buildCommandMenuGroups,
	getCommandMenuShortcut,
	ShortcutTokens,
	ShortcutHelp,
	buildShortcutHelpGroups,
	getShortcutHelpShortcut,
} from './components'

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

export { bindShellCommand, createDisabledCommand, createShellCommandAdapter } from './adapters'

export type { ShellCommandActions, ShellCommandAdapter, ShellNavigationTarget } from './adapters'

// ── Registry factory ────────────────────────────────────────────────────────

export { allCommands, commandRegistry, createShellCommandRegistry } from './commands'

// ── IPC · 外部/唤起打开意图 ─────────────────────────────────────────────────

export { takePendingCommandOpenIntent } from './api/commandOpenIntent'
