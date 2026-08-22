import type {
	Command,
	CommandContext,
	CommandInvocation,
	TaskPlacementTarget,
} from '@/features/command/core'
import type { ShellNavigationTarget } from '@/shared/types'

/**
 * 壳铬架必填动作：菜单 / 创建 dialog / 关层 / 导航。
 * compose 只校验这组；加壳命令时才改这里 + registerShellChromeCommands。
 */
export type ShellChromeCommandActions = {
	openCommandMenu: () => void
	openShortcutHelp: () => void
	focusSearch: () => void
	openQuickTaskCreate: () => void
	openFullTaskCreate: () => void
	openStandaloneTaskCreate: () => void
	openProjectCreate: () => void
	openTaskPicker: () => void
	openProjectPicker: () => void
	navigateTo: (target: ShellNavigationTarget) => void
	closeCurrentLayer: (ctx: CommandContext) => void | Promise<void>
	toggleSidebar: () => void
	goBack: () => void
	goForward: () => void
}

/**
 * 各域 register 贡献的动作。装配时按 register 出现；缺则 bind 侧禁用对应命令。
 */
export type ShellDomainCommandActions = {
	peekTask: (ctx: CommandContext) => void | Promise<void>
	openTaskDetail: (ctx: CommandContext) => void | Promise<void>
	openTaskPlacementPicker: (ctx: CommandContext) => void
	applyTaskPlacement: (target: TaskPlacementTarget, ctx: CommandContext) => void | Promise<void>
	openTaskPriorityPicker: (ctx: CommandContext) => void
	openTaskStatusPicker: (ctx: CommandContext) => void
	openTaskDatePicker: (ctx: CommandContext) => void
	completeSelectedTasks: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	requestArchiveSelectedTasks: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	requestDeleteSelectedTasks: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	requestArchiveSelectedProjects: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	requestDeleteSelectedProjects: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	restoreSelectedLifecycleEntries: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	requestDeleteSelectedLifecycleEntries: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	requestDeletePermanentlySelectedLifecycleEntries: (
		ctx: CommandContext,
		invocation: CommandInvocation,
	) => void | Promise<void>
	submitActiveForm: (ctx: CommandContext) => void | Promise<void>
	submitAndContinue: (ctx: CommandContext) => void | Promise<void>
	submitAndOpen: (ctx: CommandContext) => void | Promise<void>
	togglePreview: (ctx: CommandContext) => void | Promise<void>
	/** 打开锚定 FilterMenu */
	openFilterMenu: (ctx: CommandContext) => void
	clearAllFilters: (ctx: CommandContext) => void
	/** 打开锚定 Display 面板 */
	openDisplayOptions: (ctx: CommandContext) => void
}

/** 全量装配形状（chrome ∪ domain）；域 register 用 Pick 从此取键 */
export type ShellCommandActions = ShellChromeCommandActions & ShellDomainCommandActions

/** Registry / bind 输入：chrome 必填，域可缺 */
export type ShellCommandAdapter = ShellChromeCommandActions & Partial<ShellDomainCommandActions>

/** compose DEV 校验用；与 `registerShellChromeCommands` 返回键对齐 */
export const SHELL_CHROME_ACTION_KEYS = [
	'openCommandMenu',
	'openShortcutHelp',
	'focusSearch',
	'openQuickTaskCreate',
	'openFullTaskCreate',
	'openStandaloneTaskCreate',
	'openProjectCreate',
	'openTaskPicker',
	'openProjectPicker',
	'navigateTo',
	'closeCurrentLayer',
	'toggleSidebar',
	'goBack',
	'goForward',
] as const satisfies ReadonlyArray<keyof ShellChromeCommandActions>

/** 域 handler 未 register 时的禁用文案 */
export const UNREGISTERED_HANDLER_REASON = '该命令处理器尚未注册'

export function createDisabledCommand(command: Command, reason: string): Command {
	return {
		...command,
		isEnabled: () => false,
		getDisabledReason: () => reason,
		run: () => {},
	}
}
