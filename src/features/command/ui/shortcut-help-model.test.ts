import { createShellCommandRegistry } from '@/features/command/commands'
import { CommandRuntime, COMMAND_IDS, createEmptyCommandContext } from '@/features/command/core'
import type { ShellCommandActions } from '@/features/command/adapters'

import { buildShortcutHelpGroups, getShortcutHelpShortcut } from './shortcut-help-model'

describe('shortcut-help-model', () => {
	it('帮助页保留 command-only 命令和 openCommandMenu 这类真实能力', () => {
		const groups = buildShortcutHelpGroups(createRuntime(), createEmptyCommandContext())
		const entries = groups.flatMap((group) => group.entries)

		expect(entries.some((entry) => entry.id === COMMAND_IDS.openCommandMenu)).toBe(true)
		expect(
			entries.some((entry) => entry.id === COMMAND_IDS.taskComplete && entry.isCommandOnly),
		).toBe(true)
	})

	it('快捷键文案来自 registry，未绑定命令返回空', () => {
		expect(getShortcutHelpShortcut(COMMAND_IDS.openShortcutHelp)).toBeTruthy()
		expect(getShortcutHelpShortcut(COMMAND_IDS.taskComplete)).toBeNull()
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
		openInboxTaskCreate: vi.fn(),
		openProjectCreate: vi.fn(),
		openTaskPicker: vi.fn(),
		openProjectPicker: vi.fn(),
		openTaskProjectPicker: vi.fn(),
		openTaskPriorityPicker: vi.fn(),
		openTaskStatusPicker: vi.fn(),
		openTaskDatePicker: vi.fn(),
		completeSelectedTasks: vi.fn(),
		moveSelectedTasksToInbox: vi.fn(),
		moveSelectedTasksToNoProject: vi.fn(),
		requestArchiveSelectedTasks: vi.fn(),
		requestDeleteSelectedTasks: vi.fn(),
		requestArchiveSelectedProjects: vi.fn(),
		requestDeleteSelectedProjects: vi.fn(),
		restoreSelectedLifecycleEntries: vi.fn(),
		requestDeleteSelectedLifecycleEntries: vi.fn(),
		requestDeletePermanentlySelectedLifecycleEntries: vi.fn(),
		navigateTo: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}
