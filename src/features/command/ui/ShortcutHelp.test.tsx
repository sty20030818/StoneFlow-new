import { render, screen } from '@testing-library/react'

import { createShellCommandRegistry } from '@/features/command/commands'
import { CommandRuntime, createEmptyCommandContext } from '@/features/command/core'
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

		expect(screen.getByText('创建')).toBeInTheDocument()
		expect(screen.getByText('打开命令菜单')).toBeInTheDocument()
		expect(screen.getByText('完成任务')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '关闭快捷键帮助' })).toBeInTheDocument()
		expect(screen.getAllByText('命令内').length).toBeGreaterThan(0)
		expect(screen.getAllByText('/').length).toBeGreaterThan(0)
		expect(screen.getAllByText('未绑定').length).toBeGreaterThan(0)
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
		toggleSidebar: vi.fn(),
		togglePreview: vi.fn(),
		openFilterPicker: vi.fn(),
		toggleCompletedFilter: vi.fn(),
		clearAllFilters: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}
