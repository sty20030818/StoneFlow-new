import { COMMAND_IDS, type CommandId } from '@/features/command/core'

import type { Keybinding, KeybindingDisplay, KeybindingSequence } from './keybinding.types'

type GlobalBindingOptions = {
	allowInEditable?: boolean
	preventDefault?: boolean
}

function globalBinding(
	display: KeybindingDisplay,
	commandId: CommandId,
	sequence: KeybindingSequence,
	options: GlobalBindingOptions = {},
): Keybinding {
	return {
		commandId,
		sequence,
		scope: 'global',
		display,
		preventDefault: options.preventDefault ?? shouldPreventDefault(sequence),
		allowInEditable: options.allowInEditable ?? false,
	}
}

const primary = (
	commandId: CommandId,
	sequence: KeybindingSequence,
	options?: GlobalBindingOptions,
) => globalBinding('primary', commandId, sequence, options)

const alternative = (commandId: CommandId, sequence: KeybindingSequence) =>
	globalBinding('alternative', commandId, sequence)

/**
 * 默认快捷键声明同时服务于运行匹配和界面展示，只包含已经接入且可执行的命令。
 * `hidden` 保留给“真实可执行但不应展示”的运行时绑定，不得用于尚未接入的命令。
 */
export const DEFAULT_KEYBINDINGS: readonly Keybinding[] = [
	primary(COMMAND_IDS.openCommandMenu, [{ key: 'k', mod: true }], {
		allowInEditable: true,
		preventDefault: false,
	}),
	primary(COMMAND_IDS.openSearch, [{ key: '/' }]),
	primary(COMMAND_IDS.close, [{ key: 'Escape' }], { allowInEditable: true }),
	primary(COMMAND_IDS.selectionDeleteByRoute, [{ key: 'Backspace', mod: true }]),
	primary(COMMAND_IDS.layoutToggleSidebar, [{ key: '[' }]),
	primary(COMMAND_IDS.layoutTogglePreview, [{ key: ']' }]),
	primary(COMMAND_IDS.saveOrSubmit, [{ key: 'Enter', mod: true }], {
		allowInEditable: true,
	}),
	primary(COMMAND_IDS.submitAndContinue, [{ key: 'Enter', mod: true, shift: true }], {
		allowInEditable: true,
	}),
	primary(COMMAND_IDS.submitAndOpen, [{ key: 'Enter', mod: true, alt: true }], {
		allowInEditable: true,
	}),
	primary(COMMAND_IDS.openShortcutHelp, [{ key: '/', mod: true }], {
		allowInEditable: true,
	}),
	primary(COMMAND_IDS.openSettings, [{ key: ',', mod: true }], { allowInEditable: true }),
	primary(COMMAND_IDS.goBack, [{ key: '[', mod: true }], { allowInEditable: true }),
	primary(COMMAND_IDS.goForward, [{ key: ']', mod: true }], { allowInEditable: true }),
	primary(COMMAND_IDS.newQuickTask, [{ key: 'c' }]),
	primary(COMMAND_IDS.newFullTask, [{ key: 'n' }, { key: 't' }]),
	primary(COMMAND_IDS.newStandaloneTask, [{ key: 'n' }, { key: 'i' }]),
	primary(COMMAND_IDS.newProject, [{ key: 'n' }, { key: 'p' }]),
	primary(COMMAND_IDS.openTask, [{ key: 'o' }, { key: 't' }]),
	primary(COMMAND_IDS.openProject, [{ key: 'o' }, { key: 'p' }]),
	primary(COMMAND_IDS.taskChangePlacement, [{ key: 'p', shift: true }]),
	primary(COMMAND_IDS.goStandalone, [{ key: 'g' }, { key: 'i' }]),
	primary(COMMAND_IDS.goAllTasks, [{ key: 'g' }, { key: 't' }]),
	primary(COMMAND_IDS.goFocus, [{ key: 'g' }, { key: 'f' }]),
	primary(COMMAND_IDS.goViews, [{ key: 'g' }, { key: 'v' }]),
	primary(COMMAND_IDS.goProjects, [{ key: 'g' }, { key: 'p' }]),
	primary(COMMAND_IDS.goArchive, [{ key: 'g' }, { key: 'a' }]),
	primary(COMMAND_IDS.goTrash, [{ key: 'g' }, { key: 'x' }]),
	alternative(COMMAND_IDS.openSettings, [{ key: 'g' }, { key: 's' }]),
	primary(COMMAND_IDS.filterAdd, [{ key: 'f' }]),
	primary(COMMAND_IDS.displayOpenOptions, [{ key: 'f', shift: true }]),
]

function shouldPreventDefault(sequence: KeybindingSequence) {
	return sequence.some(
		(stroke) =>
			Boolean(stroke.mod || stroke.meta || stroke.ctrl || stroke.alt) ||
			stroke.key === 'Enter' ||
			stroke.key === 'Delete' ||
			stroke.key === 'Backspace' ||
			stroke.key === 'Escape' ||
			stroke.key === 'Space',
	)
}
