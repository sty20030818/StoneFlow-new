import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { createShellCommandRegistry } from '@/features/command/commands'
import { CommandRuntime, createEmptyCommandContext } from '@/features/command/core'
import { DEFAULT_KEYBINDINGS, KeybindingRegistry } from '@/features/command/keybinding'
import { ShortcutRegistryProvider } from '@/features/command/shortcuts'
import type { ShellCommandActions } from '@/features/command/adapters'
import { TASK_ROW_SHORTCUT_BINDINGS } from '@/features/task/shortcut-contribution'

import { ShortcutHelp } from './ShortcutHelp'

describe('ShortcutHelp', () => {
	it('按分类仅展示拥有真实绑定的快捷键', async () => {
		const onOpenChange = vi.fn()
		renderShortcutHelp(
			<ShortcutHelp
				context={createEmptyCommandContext()}
				description='测试'
				onOpenChange={onOpenChange}
				open
				runtime={createRuntime()}
				title='快捷键'
			/>,
		)

		expect(screen.getByText('创建')).toBeInTheDocument()
		expect(screen.getByText('打开命令菜单')).toBeInTheDocument()
		expect(screen.getByText('完成任务')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '关闭快捷键帮助' })).toBeInTheDocument()
		expect(screen.getAllByText('/').length).toBeGreaterThan(0)
		expect(screen.getAllByText('/')[0].closest('kbd')).not.toBeNull()
		expect(screen.queryByText('命令内')).not.toBeInTheDocument()
		expect(screen.queryByText('未绑定')).not.toBeInTheDocument()
		const closeButton = screen.getByRole('button', { name: '关闭快捷键帮助' })
		fireEvent.keyDown(document, { key: 'Tab' })
		closeButton.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
		fireEvent.pointerDown(closeButton, { pointerType: 'mouse' })
		fireEvent.click(closeButton)
		expect(onOpenChange).toHaveBeenCalledWith(false)
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('列表区使用 Modal 内建滚动区域，标题和描述保留在区域外', () => {
		renderShortcutHelp(
			<ShortcutHelp
				context={createEmptyCommandContext()}
				description='测试'
				onOpenChange={vi.fn()}
				open
				runtime={createRuntime()}
				title='快捷键'
			/>,
		)

		const dialog = screen.getByRole('dialog', { name: '快捷键' })
		const title = screen.getByRole('heading', { name: '快捷键' })
		const listRegion = screen.getByRole('region', { name: '快捷键列表' })
		const listItem = screen.getByText('打开命令菜单')

		expect(dialog).toHaveAccessibleDescription('测试')
		expect(listRegion).toContainElement(listItem)
		expect(listRegion).not.toContainElement(title)
	})
})

function createRuntime() {
	return new CommandRuntime({
		registry: createShellCommandRegistry(createActions()),
		getContext: createEmptyCommandContext,
	})
}

const shortcutRegistry = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...TASK_ROW_SHORTCUT_BINDINGS,
])

function renderShortcutHelp(node: React.ReactNode) {
	return render(
		<ShortcutRegistryProvider registry={shortcutRegistry}>{node}</ShortcutRegistryProvider>,
	)
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
