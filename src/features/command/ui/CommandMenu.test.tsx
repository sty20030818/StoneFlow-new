import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { searchEntities } from '@/features/global-search/api/searchEntities'
import { createShellCommandRegistry } from '@/features/command/commands'
import {
	CommandRuntime,
	COMMAND_IDS,
	createEmptyCommandContext,
	type CommandId,
} from '@/features/command/core'
import type { ShellCommandActions } from '@/features/command/adapters'
import type { SearchEntitiesResult, SearchProjectItem, SearchTaskItem } from '@/shared/types'
import { CommandMenu } from './CommandMenu'

vi.mock('@/features/global-search/api/searchEntities', () => ({
	searchEntities: vi.fn<typeof searchEntities>(),
}))

const mockedSearchEntities = vi.mocked(searchEntities)

describe('CommandMenu', () => {
	beforeEach(() => {
		mockedSearchEntities.mockReset()
	})

	it('渲染 registry 静态命令和动态项目区', () => {
		renderCommandMenu()

		expect(screen.getByText('打开任务')).toBeInTheDocument()
		expect(screen.getByText('快速新建任务')).toBeInTheDocument()
		expect(screen.getByText('完整新建任务')).toBeInTheDocument()
		expect(screen.getByText('前往收件箱')).toBeInTheDocument()
		expect(screen.getByText('项目 A')).toBeInTheDocument()
	})

	it('渲染 V1 command-only 命令面', () => {
		renderCommandMenu()

		expect(screen.getByText('完成任务')).toBeInTheDocument()
		expect(screen.getByText('重命名任务')).toBeInTheDocument()
		expect(screen.getByText('按项目筛选')).toBeInTheDocument()
		expect(screen.getByText('切换侧边栏')).toBeInTheDocument()
		expect(screen.getByText('打开数据文件夹')).toBeInTheDocument()
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

	it('command-only disabled 命令不触发执行', () => {
		const onRunCommand = vi.fn<(id: CommandId) => void>()
		renderCommandMenu({ onRunCommand })

		fireEvent.click(screen.getByText('完成任务'))

		expect(onRunCommand).not.toHaveBeenCalled()
		expect(screen.getAllByText('Row 上下文尚未接入').length).toBeGreaterThan(0)
	})

	it('动态项目区沿用外部导航回调', () => {
		const onNavigateProject = vi.fn<(projectId: string) => void>()
		renderCommandMenu({ onNavigateProject })

		fireEvent.click(screen.getByText('项目 A'))

		expect(onNavigateProject).toHaveBeenCalledWith('project-a')
	})

	it('task-picker mode 只渲染任务结果，选择任务后回调并关闭菜单', async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTask = vi.fn<(task: SearchTaskItem) => void>()
		mockedSearchEntities.mockResolvedValue(createSearchResult({
			tasks: [createTaskResult({ id: 'task-a', title: '任务 A' })],
			projects: [createProjectResult({ id: 'project-a', name: '项目结果 A' })],
		}))
		renderCommandMenu({ mode: 'task-picker', onOpenChange, onSelectTask })

		fireEvent.change(screen.getByPlaceholderText('搜索任务…'), { target: { value: 'A' } })
		await waitFor(() => expect(mockedSearchEntities).toHaveBeenCalledTimes(1))
		fireEvent.click(await screen.findByText('任务 A'))

		expect(screen.queryByText('项目结果 A')).not.toBeInTheDocument()
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-a' }))
	})

	it('project-picker mode 只渲染项目结果，选择项目后回调并关闭菜单', async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectProject = vi.fn<(project: SearchProjectItem) => void>()
		mockedSearchEntities.mockResolvedValue(createSearchResult({
			tasks: [createTaskResult({ id: 'task-a', title: '任务 A' })],
			projects: [createProjectResult({ id: 'project-a', name: '项目 A' })],
		}))
		renderCommandMenu({ mode: 'project-picker', onOpenChange, onSelectProject })

		fireEvent.change(screen.getByPlaceholderText('搜索项目…'), { target: { value: 'A' } })
		await waitFor(() => expect(mockedSearchEntities).toHaveBeenCalledTimes(1))
		fireEvent.click(await screen.findByText('项目 A'))

		expect(screen.queryByText('任务 A')).not.toBeInTheDocument()
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'project-a' }))
	})

	it('scoped mode 空态文案区分任务和项目', async () => {
		mockedSearchEntities.mockResolvedValue(createSearchResult())
		const { rerender } = renderCommandMenu({ mode: 'task-picker' })

		fireEvent.change(screen.getByPlaceholderText('搜索任务…'), { target: { value: 'none' } })
		await waitFor(() => expect(mockedSearchEntities).toHaveBeenCalledTimes(1))
		expect(await screen.findByText('没有匹配的任务')).toBeInTheDocument()

		rerender(createCommandMenuElement({ mode: 'project-picker' }))
		fireEvent.change(screen.getByPlaceholderText('搜索项目…'), { target: { value: 'none' } })
		await waitFor(() => expect(mockedSearchEntities).toHaveBeenCalledTimes(2))
		expect(await screen.findByText('没有匹配的项目')).toBeInTheDocument()
	})
})

function renderCommandMenu({
	mode = 'default',
	onNavigateProject = vi.fn(),
	onOpenChange = vi.fn(),
	onRunCommand = vi.fn(),
	onSelectProject = vi.fn(),
	onSelectTask = vi.fn(),
}: Partial<{
	mode: 'default' | 'task-picker' | 'project-picker'
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTask: (task: SearchTaskItem) => void
}> = {}) {
	return render(createCommandMenuElement({
		mode,
		onNavigateProject,
		onOpenChange,
		onRunCommand,
		onSelectProject,
		onSelectTask,
	}))
}

function createCommandMenuElement({
	mode = 'default',
	onNavigateProject = vi.fn(),
	onOpenChange = vi.fn(),
	onRunCommand = vi.fn(),
	onSelectProject = vi.fn(),
	onSelectTask = vi.fn(),
}: Partial<{
	mode: 'default' | 'task-picker' | 'project-picker'
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTask: (task: SearchTaskItem) => void
}> = {}) {
	return (
		<CommandMenu
			context={createEmptyCommandContext()}
			description='测试'
			mode={mode}
			onNavigateProject={onNavigateProject}
			onOpenChange={onOpenChange}
			onRunCommand={onRunCommand}
			onSelectProject={onSelectProject}
			onSelectTask={onSelectTask}
			open
			projects={[{ id: 'project-a', label: '项目 A', badge: '2' }]}
			runtime={createRuntime()}
			title='StoneFlow Command'
		/>
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
		openTaskPicker: vi.fn(),
		openProjectPicker: vi.fn(),
		navigateTo: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}

function createSearchResult(overrides: Partial<SearchEntitiesResult> = {}): SearchEntitiesResult {
	return {
		tasks: [],
		projects: [],
		completedTasks: [],
		completedProjects: [],
		...overrides,
	}
}

function createTaskResult(overrides: Partial<SearchTaskItem> = {}): SearchTaskItem {
	return {
		id: 'task-a',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: 'project-a',
		title: '任务 A',
		note: null,
		priority: 2,
		status: 'todo',
		inboxAt: null,
		projectName: '项目 A',
		updatedAt: '2026-05-15T00:00:00Z',
		completedAt: null,
		...overrides,
	}
}

function createProjectResult(overrides: Partial<SearchProjectItem> = {}): SearchProjectItem {
	return {
		id: 'project-a',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		name: '项目 A',
		note: null,
		updatedAt: '2026-05-15T00:00:00Z',
		completedAt: null,
		...overrides,
	}
}
