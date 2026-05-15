import { render, screen } from '@testing-library/react'

import { createShellCommandRegistry } from '@/features/command/commands'
import {
	CommandRuntime,
	createEmptyCommandContext,
} from '@/features/command/core'
import type { ShellCommandActions } from '@/features/command/adapters'

import { ShortcutHelp } from './ShortcutHelp'

describe('ShortcutHelp', () => {
	it('按分类展示命令、保留 command-only，并显示快捷键或无默认快捷键', () => {
		render(
			<ShortcutHelp
				context={createEmptyCommandContext()}
				description='测试'
				onOpenChange={vi.fn()}
				open
				runtime={createRuntime()}
				title='快捷键'
			/>,
		)

		expect(screen.getByText('通用')).toBeInTheDocument()
		expect(screen.getByText('打开命令菜单')).toBeInTheDocument()
		expect(screen.getByText('完成任务')).toBeInTheDocument()
		expect(screen.getAllByText('Command Only').length).toBeGreaterThan(0)
		expect(screen.getAllByText(/\/|Ctrl \/|⌘\//).length).toBeGreaterThan(0)
		expect(screen.getAllByText('无默认快捷键').length).toBeGreaterThan(0)
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
		navigateTo: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}
