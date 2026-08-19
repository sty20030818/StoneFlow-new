import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { ShellCommandActions } from '@/features/command/adapters'
import { createShellCommandRegistry } from '@/features/command/commands'
import {
	CommandRuntime,
	createEmptyCommandContext,
	type CommandContext,
	type TaskPlacementTarget,
} from '@/features/command/core'
import { DEFAULT_KEYBINDINGS, KeybindingRegistry } from '@/features/command/keybinding'
import { ShortcutRegistryProvider } from '@/features/command/shortcuts'
import { useDialogStore } from '@/features/shell-dialogs'
import type { SearchEntitiesResult, SearchProjectItem, SearchTaskItem } from '@/shared/types'

import { CommandMenu } from './CommandMenu'
import type { CommandMenuMode } from './command-menu-types'

const searchMock = vi.hoisted(() => ({
	result: {
		tasks: [],
		projects: [],
		completedTasks: [],
		completedProjects: [],
	} as SearchEntitiesResult,
}))

vi.mock('@/features/global-search', () => ({
	useGlobalSearch: (query: string) => ({
		result: searchMock.result,
		isLoading: false,
		errorMessage: null,
		hasResolvedQuery: Boolean(query.trim()),
	}),
}))

describe('CommandMenu', () => {
	beforeEach(() => {
		searchMock.result = emptySearchResult()
		useDialogStore.setState({ customDateDialog: null })
	})

	it('提供可访问的命令对话框，并由 Escape 关闭', async () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		renderCommandMenu({ onOpenChange })

		const input = screen.getByRole('searchbox', { name: '输入命令 或 搜索 …' })
		expect(screen.getByRole('dialog', { name: 'StoneFlow Command' })).toBeInTheDocument()
		expect(screen.getByRole('menu', { name: '命令' })).toBeInTheDocument()
		await waitFor(() => expect(input).toHaveFocus())

		fireEvent.keyDown(input, { key: 'Escape' })
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('把静态命令和动态项目交给各自的外部执行入口', () => {
		const openQuickTaskCreate = vi.fn()
		const onNavigateProject = vi.fn<(projectId: string) => void>()
		const onOpenChange = vi.fn<(open: boolean) => void>()
		renderCommandMenu({
			onNavigateProject,
			onOpenChange,
			runtime: createRuntime({ ...createActions(), openQuickTaskCreate }),
		})

		fireEvent.click(screen.getByText('项目 A'))
		fireEvent.click(screen.getByText('快速新建任务'))

		expect(onNavigateProject).toHaveBeenCalledWith('project-a')
		expect(openQuickTaskCreate).toHaveBeenCalledOnce()
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('disabled 命令只展示原因，不触发执行', () => {
		renderCommandMenu()

		fireEvent.click(screen.getByText('新建视图'))

		expect(screen.getByText('视图创建入口尚未接入')).toBeInTheDocument()
	})

	it('task picker 只呈现任务，并在选择后回调和关闭', () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTask = vi.fn<(task: SearchTaskItem) => void>()
		searchMock.result = createSearchResult({
			tasks: [createTaskResult({ id: 'task-a', title: '任务 A' })],
			projects: [createProjectResult({ id: 'project-a', name: '项目结果 A' })],
		})
		renderCommandMenu({ mode: 'task-picker', onOpenChange, onSelectTask })

		fireEvent.change(screen.getByPlaceholderText('搜索任务…'), { target: { value: 'A' } })
		fireEvent.click(screen.getByText('任务 A'))

		expect(screen.queryByText('项目结果 A')).not.toBeInTheDocument()
		expect(onSelectTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-a' }))
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('placement picker 按 Space 呈现目标，并返回 stable target', () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTaskPlacement = vi.fn<(target: TaskPlacementTarget) => void>()
		searchMock.result = createSearchResult({
			projects: [
				createProjectResult({
					id: 'project-a',
					name: '项目 A',
					spaceId: 'space-a',
					spaceName: '工作',
				}),
				createProjectResult({
					id: 'project-b',
					name: '项目 B',
					spaceId: 'space-b',
					spaceName: '生活',
				}),
			],
		})
		renderCommandMenu({
			mode: 'task-placement-picker',
			context: createTaskSelectionContext(),
			onOpenChange,
			onSelectTaskPlacement,
		})

		fireEvent.change(screen.getByPlaceholderText('移动到项目或独立事项...'), {
			target: { value: '项目' },
		})
		expect(screen.getByText('工作')).toBeInTheDocument()
		expect(screen.getByText('生活')).toBeInTheDocument()
		fireEvent.click(screen.getAllByText('独立事项')[0]!)

		expect(onSelectTaskPlacement).toHaveBeenCalledWith({
			kind: 'standalone',
			spaceId: 'space-a',
		})
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('非搜索 picker 保留数字快捷选择，不把数字写入搜索', () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTaskPriority = vi.fn<(priority: number) => void>()
		renderCommandMenu({ mode: 'task-priority-picker', onOpenChange, onSelectTaskPriority })

		fireEvent.keyDown(screen.getByRole('menu'), { key: '0' })

		expect(onSelectTaskPriority).toHaveBeenCalledWith(0)
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(screen.getByPlaceholderText('选择优先级…')).toHaveValue('')
	})

	it('date picker 把现有值交给自定义日期弹窗，并转发提交值', () => {
		const onOpenChange = vi.fn<(open: boolean) => void>()
		const onSelectTaskDate = vi.fn<(dueAt: string | null) => void>()
		renderCommandMenu({
			mode: 'task-date-picker',
			context: createTaskSelectionContext(),
			onOpenChange,
			onSelectTaskDate,
		})

		fireEvent.click(screen.getByText('自定义日期'))

		const dialog = useDialogStore.getState().customDateDialog
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onSelectTaskDate).not.toHaveBeenCalled()
		expect(dialog).toMatchObject({
			fieldKey: 'dueDate',
			value: '2026-05-08',
			hasExistingValue: true,
		})
		if (!dialog?.onSubmit) throw new Error('自定义日期提交回调未注册')

		dialog.onSubmit('2026-05-12')
		expect(onSelectTaskDate).toHaveBeenCalledWith('2026-05-12')
	})
})

type RenderCommandMenuOptions = Partial<{
	mode: CommandMenuMode
	context: CommandContext
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskPriority: (priority: number) => void
	onSelectTaskStatus: (status: string) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskPlacement: (target: TaskPlacementTarget) => void
	onSelectTask: (task: SearchTaskItem) => void
	runtime: CommandRuntime
}>

function renderCommandMenu({
	mode = 'default',
	context = createEmptyCommandContext(),
	onNavigateProject = vi.fn(),
	onOpenChange = vi.fn(),
	onSelectTaskDate = vi.fn(),
	onSelectTaskPriority = vi.fn(),
	onSelectTaskStatus = vi.fn(),
	onSelectProject = vi.fn(),
	onSelectTaskPlacement = vi.fn(),
	onSelectTask = vi.fn(),
	runtime = createRuntime(),
}: RenderCommandMenuOptions = {}) {
	return render(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<CommandMenu
				context={context}
				description='测试'
				mode={mode}
				onNavigateProject={onNavigateProject}
				onOpenChange={onOpenChange}
				onSelectProject={onSelectProject}
				onSelectTask={onSelectTask}
				onSelectTaskDate={onSelectTaskDate}
				onSelectTaskPlacement={onSelectTaskPlacement}
				onSelectTaskPriority={onSelectTaskPriority}
				onSelectTaskStatus={onSelectTaskStatus}
				open
				projects={[{ id: 'project-a', label: '项目 A', badge: '2' }]}
				runtime={runtime}
				spaces={TEST_SPACES}
				title='StoneFlow Command'
			/>
		</ShortcutRegistryProvider>,
	)
}

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

const TEST_SPACES = [
	{
		id: 'space-a',
		name: '工作',
		iconKey: 'briefcase',
		colorKey: 'blue',
		isDefault: true,
		position: 1,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
	},
	{
		id: 'space-b',
		name: '生活',
		iconKey: 'leaf',
		colorKey: 'green',
		isDefault: false,
		position: 2,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
	},
]

function createRuntime(actions = createActions()) {
	return new CommandRuntime({
		registry: createShellCommandRegistry(actions),
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
		toggleCompletedFilter: vi.fn(),
		clearAllFilters: vi.fn(),
		openDisplayOptions: vi.fn(),
		goBack: vi.fn(),
		goForward: vi.fn(),
	}
}

function createTaskSelectionContext(): CommandContext {
	return {
		...createEmptyCommandContext(),
		selection: {
			type: 'task',
			ids: ['task-a'],
			entities: [
				{
					id: 'task-a',
					type: 'task',
					title: '任务 A',
					spaceId: 'space-a',
					projectId: 'project-a',
					status: 'todo',
					dueAt: '2026-05-08',
				},
			],
			primaryEntity: {
				id: 'task-a',
				type: 'task',
				title: '任务 A',
				spaceId: 'space-a',
				projectId: 'project-a',
			},
			source: 'task-list',
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		},
	}
}

function emptySearchResult(): SearchEntitiesResult {
	return { tasks: [], projects: [], completedTasks: [], completedProjects: [] }
}

function createSearchResult(overrides: Partial<SearchEntitiesResult> = {}): SearchEntitiesResult {
	return { ...emptySearchResult(), ...overrides }
}

function createTaskResult(overrides: Partial<SearchTaskItem> = {}): SearchTaskItem {
	return {
		id: 'task-a',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: 'project-a',
		projectName: '项目 A',
		title: '任务 A',
		note: null,
		priority: 2,
		status: 'todo',
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
