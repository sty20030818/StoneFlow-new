import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { searchEntities } from '@/features/global-search/api/searchEntities'
import { createShellCommandRegistry } from '@/features/command/commands'
import {
	CommandRuntime,
	COMMAND_IDS,
	createEmptyCommandContext,
	type CommandContext,
	type CommandId,
	type TaskPlacementTarget,
} from '@/features/command/core'
import type { ShellCommandActions } from '@/features/command/adapters'
import type { PageFilterApplyInput, PageFilterKind } from '@/features/filter/model'
import type { SearchEntitiesResult, SearchProjectItem, SearchTaskItem } from '@/shared/types'
import { CommandMenu } from './CommandMenu'
import type { CommandMenuMode } from './command-menu-types'

vi.mock('@/features/global-search/api/searchEntities', () => ({
	searchEntities: vi.fn<typeof searchEntities>(),
}))

const mockedSearchEntities = searchEntities as ReturnType<typeof vi.fn<typeof searchEntities>>

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
		expect(screen.getByText('创建')).toBeInTheDocument()
		expect(screen.getByText('导航')).toBeInTheDocument()
	})

	it('渲染 V1 command-only 命令面', () => {
		renderCommandMenu()

		expect(screen.getByText('完成任务')).toBeInTheDocument()
		expect(screen.getByText('重命名任务')).toBeInTheDocument()
		expect(screen.getByText('按项目筛选')).toBeInTheDocument()
		expect(screen.getByText('切换侧边栏')).toBeInTheDocument()
		expect(screen.getByText('打开数据文件夹')).toBeInTheDocument()
	})

	it('普通组合键和 chord 都按拆键方式渲染', () => {
		renderCommandMenu()

		expect(screen.getAllByText('C').length).toBeGreaterThan(0)
		expect(screen.getAllByText('N').length).toBeGreaterThan(0)
		expect(screen.getAllByText('T').length).toBeGreaterThan(0)
		expect(document.querySelectorAll('svg').length).toBeGreaterThan(0)
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
		expect(screen.getAllByText('需要先选择任务').length).toBeGreaterThan(0)
	})

	it('有任务选择时显示 chips 和批量操作分组', () => {
		renderCommandMenu({ context: createTaskSelectionContext() })

		expect(screen.getByLabelText('当前选中对象')).toHaveTextContent('任务 A')
		expect(screen.getByLabelText('当前选中对象')).toHaveTextContent('任务 B')
		expect(screen.getByText('批量操作')).toBeInTheDocument()
		expect(screen.getByText('完成任务')).toBeInTheDocument()
		expect(screen.getByText('归档任务')).toBeInTheDocument()
		expect(screen.getByText('删除任务')).toBeInTheDocument()
	})

	it('有项目选择时显示项目批量操作分组', () => {
		renderCommandMenu({ context: createProjectSelectionContext() })

		expect(screen.getByLabelText('当前选中对象')).toHaveTextContent('项目 A')
		expect(screen.getByLabelText('当前选中对象')).toHaveTextContent('项目 B')
		expect(screen.getByText('批量操作')).toBeInTheDocument()
		expect(screen.getByText('归档项目')).toBeInTheDocument()
		expect(screen.getByText('删除项目')).toBeInTheDocument()
		expect(screen.queryByText('完成任务')).not.toBeInTheDocument()
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
		mockedSearchEntities.mockResolvedValue(
			createSearchResult({
				tasks: [createTaskResult({ id: 'task-a', title: '任务 A' })],
				projects: [createProjectResult({ id: 'project-a', name: '项目结果 A' })],
			}),
		)
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
		mockedSearchEntities.mockResolvedValue(
			createSearchResult({
				tasks: [createTaskResult({ id: 'task-a', title: '任务 A' })],
				projects: [createProjectResult({ id: 'project-a', name: '项目 A' })],
			}),
		)
		renderCommandMenu({ mode: 'project-picker', onOpenChange, onSelectProject })

		fireEvent.change(screen.getByPlaceholderText('搜索项目…'), { target: { value: 'A' } })
		await waitFor(() => expect(mockedSearchEntities).toHaveBeenCalledTimes(1))
		fireEvent.click(await screen.findByText('项目 A'))

		expect(screen.queryByText('任务 A')).not.toBeInTheDocument()
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'project-a' }))
	})

	it('task-placement-picker mode 按 Space 分组渲染 placement targets，并回调选中的目标', async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTaskPlacement = vi.fn<(target: TaskPlacementTarget) => void>()
		mockedSearchEntities.mockResolvedValue(
			createSearchResult({
				projects: [
					createProjectResult({ id: 'project-a', name: '项目 A', spaceId: 'space-a', spaceName: '工作' }),
					createProjectResult({ id: 'project-b', name: '项目 B', spaceId: 'space-b', spaceName: '生活' }),
				],
			}),
		)
		renderCommandMenu({
			mode: 'task-placement-picker',
			context: createTaskSelectionContext(),
			onOpenChange,
			onSelectTaskPlacement,
		})

		fireEvent.change(screen.getByPlaceholderText('移动到项目或独立事项...'), {
			target: { value: 'A' },
		})
		await waitFor(() => expect(mockedSearchEntities).toHaveBeenCalledTimes(1))
		expect(await screen.findByText('工作')).toBeInTheDocument()
		expect(screen.getByText('生活')).toBeInTheDocument()
		expect(screen.getByText('独立事项')).toBeInTheDocument()
		fireEvent.click(screen.getByText('独立事项'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectTaskPlacement).toHaveBeenCalledWith({
			kind: 'no_project',
			spaceId: 'space-a',
		})
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

	it('task-priority-picker 选择优先级后回调并关闭菜单', () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTaskPriority = vi.fn<(priority: number) => void>()
		renderCommandMenu({ mode: 'task-priority-picker', onOpenChange, onSelectTaskPriority })

		fireEvent.click(screen.getByText('高'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectTaskPriority).toHaveBeenCalledWith(3)
	})

	it('task-status-picker 选择状态后回调并关闭菜单', () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTaskStatus = vi.fn<(status: string) => void>()
		renderCommandMenu({ mode: 'task-status-picker', onOpenChange, onSelectTaskStatus })

		fireEvent.click(screen.getByText('进行中'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectTaskStatus).toHaveBeenCalledWith('doing')
	})

	it('task-date-picker 选择日期 preset 后回调并关闭菜单，自定义日期保持 disabled', () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTaskDate = vi.fn<(dueAt: string | null) => void>()
		const { unmount } = renderCommandMenu({ mode: 'task-date-picker', onOpenChange, onSelectTaskDate })

		fireEvent.click(screen.getByText('无时间'))
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectTaskDate).toHaveBeenCalledWith(null)

		unmount()
		renderCommandMenu({ mode: 'task-date-picker', onSelectTaskDate })
		fireEvent.click(screen.getByText('自定义日期'))
		expect(screen.getByText('完整日期选择后续接入')).toBeInTheDocument()
		expect(onSelectTaskDate).toHaveBeenCalledTimes(1)
	})
})

function renderCommandMenu({
	mode = 'default',
	onNavigateProject = vi.fn(),
	onOpenChange = vi.fn(),
	onRunCommand = vi.fn(),
	onApplyFilter = vi.fn(),
	onClearAllFilters = vi.fn(),
	onSelectTaskDate = vi.fn(),
	onSelectFilterKind = vi.fn(),
	onSelectTaskPriority = vi.fn(),
	onSelectTaskStatus = vi.fn(),
	onToggleCompletedFilter = vi.fn(),
	onSelectProject = vi.fn(),
	onSelectTaskPlacement = vi.fn(),
	onSelectTask = vi.fn(),
	context = createEmptyCommandContext(),
	filterKind = 'root',
}: Partial<{
	mode: CommandMenuMode
	context: CommandContext
	filterKind: PageFilterKind
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
	onApplyFilter: (input: PageFilterApplyInput) => void
	onClearAllFilters: () => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectFilterKind: (kind: PageFilterKind) => void
	onSelectTaskPriority: (priority: number) => void
	onSelectTaskStatus: (status: string) => void
	onToggleCompletedFilter: () => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskPlacement: (target: TaskPlacementTarget) => void
	onSelectTask: (task: SearchTaskItem) => void
}> = {}) {
	return render(
		createCommandMenuElement({
			mode,
			filterKind,
			onNavigateProject,
			onOpenChange,
			onRunCommand,
			onApplyFilter,
			onClearAllFilters,
			onSelectTaskDate,
			onSelectFilterKind,
			onSelectTaskPriority,
			onSelectTaskStatus,
			onToggleCompletedFilter,
			onSelectProject,
			onSelectTaskPlacement,
			onSelectTask,
			context,
		}),
	)
}

function createCommandMenuElement({
	mode = 'default',
	onNavigateProject = vi.fn(),
	onOpenChange = vi.fn(),
	onRunCommand = vi.fn(),
	onApplyFilter = vi.fn(),
	onClearAllFilters = vi.fn(),
	onSelectTaskDate = vi.fn(),
	onSelectFilterKind = vi.fn(),
	onSelectTaskPriority = vi.fn(),
	onSelectTaskStatus = vi.fn(),
	onToggleCompletedFilter = vi.fn(),
	onSelectProject = vi.fn(),
	onSelectTaskPlacement = vi.fn(),
	onSelectTask = vi.fn(),
	context = createEmptyCommandContext(),
	filterKind = 'root',
}: Partial<{
	mode: CommandMenuMode
	context: CommandContext
	filterKind: PageFilterKind
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
	onApplyFilter: (input: PageFilterApplyInput) => void
	onClearAllFilters: () => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectFilterKind: (kind: PageFilterKind) => void
	onSelectTaskPriority: (priority: number) => void
	onSelectTaskStatus: (status: string) => void
	onToggleCompletedFilter: () => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskPlacement: (target: TaskPlacementTarget) => void
	onSelectTask: (task: SearchTaskItem) => void
}> = {}) {
	return (
		<CommandMenu
			context={context}
			description='测试'
			filterKind={filterKind}
			mode={mode}
			onApplyFilter={onApplyFilter}
			onClearAllFilters={onClearAllFilters}
			onNavigateProject={onNavigateProject}
			onOpenChange={onOpenChange}
			onSelectFilterKind={onSelectFilterKind}
			onRunCommand={onRunCommand}
			onSelectTaskDate={onSelectTaskDate}
			onSelectTaskPriority={onSelectTaskPriority}
			onSelectTaskStatus={onSelectTaskStatus}
			onToggleCompletedFilter={onToggleCompletedFilter}
			onSelectProject={onSelectProject}
			onSelectTaskPlacement={onSelectTaskPlacement}
			onSelectTask={onSelectTask}
			open
			projects={[{ id: 'project-a', label: '项目 A', badge: '2' }]}
			runtime={createRuntime()}
			spaces={[
				{ id: 'space-a', name: '工作', iconKey: 'briefcase', colorKey: 'blue', isDefault: true, sortOrder: 1, archivedAt: null, deletedAt: null, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z' },
				{ id: 'space-b', name: '生活', iconKey: 'leaf', colorKey: 'green', isDefault: false, sortOrder: 2, archivedAt: null, deletedAt: null, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z' },
			]}
			title='StoneFlow Command'
		/>
	)
}

function createRuntime() {
	return new CommandRuntime({
		registry: createShellCommandRegistry(createActions()),
		getContext: () => createEmptyCommandContext(),
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
		submitAndContinue: vi.fn(),
		submitAndOpen: vi.fn(),
		toggleSidebar: vi.fn(),
		togglePreview: vi.fn(),
		openFilterPicker: vi.fn(),
		toggleCompletedFilter: vi.fn(),
		clearAllFilters: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}

function createTaskSelectionContext(): CommandContext {
	return {
		...createEmptyCommandContext(),
		selection: {
			type: 'task',
			ids: ['task-a', 'task-b'],
			entities: [
				{ id: 'task-a', type: 'task', title: '任务 A', subtitle: 'Inbox', spaceId: 'space-a', projectId: null, inboxAt: '2026-05-15T00:00:00Z', status: 'todo' },
				{ id: 'task-b', type: 'task', title: '任务 B', subtitle: '项目 B', spaceId: 'space-a', projectId: 'project-b', inboxAt: null, status: 'done' },
			],
			primaryEntity: { id: 'task-a', type: 'task', title: '任务 A', subtitle: 'Inbox', spaceId: 'space-a', projectId: null, inboxAt: '2026-05-15T00:00:00Z' },
			source: 'task-list',
			hasSelection: true,
			isSingleSelection: false,
			isMultiSelection: true,
		},
	}
}

function createProjectSelectionContext(): CommandContext {
	return {
		...createEmptyCommandContext(),
		selection: {
			type: 'project',
			ids: ['project-a', 'project-b'],
			entities: [
				{ id: 'project-a', type: 'project', title: '项目 A', subtitle: '进行中项目' },
				{ id: 'project-b', type: 'project', title: '项目 B', subtitle: '已完成项目' },
			],
			primaryEntity: { id: 'project-a', type: 'project', title: '项目 A' },
			source: 'project-list',
			hasSelection: true,
			isSingleSelection: false,
			isMultiSelection: true,
		},
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
