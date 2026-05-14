import { fireEvent, render, screen } from '@testing-library/react'

import { createShellCommandRegistry } from '@/features/command/commands'
import {
	CommandRuntime,
	COMMAND_IDS,
	createEmptyCommandContext,
	type CommandId,
} from '@/features/command/core'
import type { ShellCommandActions } from '@/features/command/adapters'
import { CommandMenu } from './CommandMenu'

describe('CommandMenu', () => {
	it('渲染 registry 静态命令和动态项目区', () => {
		renderCommandMenu()

		expect(screen.getByText('快速新建任务')).toBeInTheDocument()
		expect(screen.getByText('完整新建任务')).toBeInTheDocument()
		expect(screen.getByText('前往收件箱')).toBeInTheDocument()
		expect(screen.getByText('项目 A')).toBeInTheDocument()
	})

	it('选择命令后执行 command id 并关闭菜单', () => {
		const onRunCommand = vi.fn<(id: CommandId) => void>()
		const onOpenChange = vi.fn<(open: boolean) => void>()
		renderCommandMenu({ onOpenChange, onRunCommand })

		fireEvent.click(screen.getByText('快速新建任务'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.newQuickTask)
	})

	it('disabled 命令不触发执行', () => {
		const onRunCommand = vi.fn<(id: CommandId) => void>()
		renderCommandMenu({ onRunCommand })

		fireEvent.click(screen.getByText('新建视图'))

		expect(onRunCommand).not.toHaveBeenCalled()
		expect(screen.getByText('视图创建入口尚未接入')).toBeInTheDocument()
	})

	it('动态项目区沿用外部导航回调', () => {
		const onNavigateProject = vi.fn<(projectId: string) => void>()
		renderCommandMenu({ onNavigateProject })

		fireEvent.click(screen.getByText('项目 A'))

		expect(onNavigateProject).toHaveBeenCalledWith('project-a')
	})
})

function renderCommandMenu({
	onNavigateProject = vi.fn(),
	onOpenChange = vi.fn(),
	onRunCommand = vi.fn(),
}: Partial<{
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
}> = {}) {
	return render(
		<CommandMenu
			context={createEmptyCommandContext()}
			description='测试'
			onNavigateProject={onNavigateProject}
			onOpenChange={onOpenChange}
			onRunCommand={onRunCommand}
			open
			projects={[{ id: 'project-a', label: '项目 A', badge: '2' }]}
			runtime={createRuntime()}
			title='StoneFlow Command'
		/>,
	)
}

function createRuntime() {
	return new CommandRuntime({
		registry: createShellCommandRegistry(createActions()),
		getContext: createEmptyCommandContext,
	})
}

function createActions(): ShellCommandActions {
	return {
		openCommandMenu: vi.fn(),
		focusSearch: vi.fn(),
		openQuickTaskCreate: vi.fn(),
		openFullTaskCreate: vi.fn(),
		openInboxTaskCreate: vi.fn(),
		openProjectCreate: vi.fn(),
		navigateTo: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}
