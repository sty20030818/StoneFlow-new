import { createShellCommandRegistry } from '@/features/command/commands'
import { CommandRuntime, COMMAND_IDS, createEmptyCommandContext } from '@/features/command/core'
import type { ShellCommandActions } from '@/features/command/adapters'
import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	type Keybinding,
} from '@/features/command/keybinding'

import { buildShortcutHelpGroups, getShortcutHelpShortcuts } from './shortcut-help-model'

const taskCompleteBinding: Keybinding = {
	commandId: COMMAND_IDS.taskComplete,
	sequence: [{ key: 'w' }],
	scope: 'row',
	display: 'primary',
	preventDefault: true,
	allowInEditable: false,
}
const shortcutRegistry = new KeybindingRegistry([...DEFAULT_KEYBINDINGS, taskCompleteBinding])

describe('shortcut-help-model', () => {
	it('帮助页仅保留拥有可展示绑定的真实快捷键', () => {
		const groups = buildShortcutHelpGroups(
			createRuntime(),
			createEmptyCommandContext(),
			shortcutRegistry,
		)
		const entries = groups.flatMap((group) => group.entries)

		expect(entries.some((entry) => entry.id === COMMAND_IDS.openCommandMenu)).toBe(true)
		expect(entries.some((entry) => entry.id === COMMAND_IDS.taskComplete)).toBe(true)
		expect(entries.some((entry) => entry.id === COMMAND_IDS.newView)).toBe(false)
	})

	it('帮助页展示 primary 与 alternative，并过滤 hidden 绑定', () => {
		expect(getShortcutHelpShortcuts(COMMAND_IDS.openSettings, shortcutRegistry)).toHaveLength(2)
		expect(getShortcutHelpShortcuts(COMMAND_IDS.taskComplete, shortcutRegistry)).toHaveLength(1)
		expect(getShortcutHelpShortcuts(COMMAND_IDS.newView, shortcutRegistry)).toEqual([])
	})
})

function createRuntime() {
	return new CommandRuntime({
		registry: createShellCommandRegistry(createActions()),
		getContext: createEmptyCommandContext,
	})
}

function createActions(): ShellCommandActions {
	return {
		openCommandMenu: vi.fn(),
		openShortcutHelp: vi.fn(),
		focusSearch: vi.fn(),
		openQuickTaskCreate: vi.fn(),
		openFullTaskCreate: vi.fn(),
		openStandaloneTaskCreate: vi.fn(),
		openProjectCreate: vi.fn(),
		openTaskPicker: vi.fn(),
		openProjectPicker: vi.fn(),
		peekTask: vi.fn(),
		openTaskDetail: vi.fn(),
		openTaskPlacementPicker: vi.fn(),
		applyTaskPlacement: vi.fn(),
		openTaskPriorityPicker: vi.fn(),
		openTaskStatusPicker: vi.fn(),
		openTaskDatePicker: vi.fn(),
		completeSelectedTasks: vi.fn(),
		requestArchiveSelectedTasks: vi.fn(),
		requestDeleteSelectedTasks: vi.fn(),
		requestArchiveSelectedProjects: vi.fn(),
		requestDeleteSelectedProjects: vi.fn(),
		restoreSelectedLifecycleEntries: vi.fn(),
		requestDeleteSelectedLifecycleEntries: vi.fn(),
		requestDeletePermanentlySelectedLifecycleEntries: vi.fn(),
		navigateTo: vi.fn(),
		closeCurrentLayer: vi.fn(),
		submitActiveForm: vi.fn(),
		submitAndContinue: vi.fn(),
		submitAndOpen: vi.fn(),
		toggleSidebar: vi.fn(),
		togglePreview: vi.fn(),
		openFilterMenu: vi.fn(),
		clearAllFilters: vi.fn(),
		openDisplayOptions: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}
