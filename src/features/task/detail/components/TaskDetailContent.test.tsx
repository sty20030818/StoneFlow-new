import { createRef } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'
import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { TASK_ROW_SHORTCUT_BINDINGS } from '@/features/task/shortcuts'
import type { TaskDetail } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { useTaskDetailViewModel } from '../model/useTaskDetailViewModel'
import { TaskDetailContent } from './TaskDetailContent'

const getEntityActivitiesMock = vi.hoisted(() => vi.fn<(input?: unknown) => Promise<unknown[]>>())
const mockDetailController = vi.hoisted(() => ({
	value: {
		task: null as TaskDetail | null,
		status: 'loading' as 'idle' | 'loading' | 'ready' | 'error',
		error: null as string | null,
		archiveOrRestore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		moveToTrash: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
	},
}))

const mockAutosave = vi.hoisted(() => ({
	value: createAutosaveController(),
}))

const mockTaskLinksController = vi.hoisted(() => ({
	value: {
		links: [] as Array<{
			id: string
			taskId: string
			title: string
			url: string
			position: number
			createdAt: string
			updatedAt: string
		}>,
		status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
		error: null as string | null,
		reloadLinks: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		addLink: vi
			.fn<(input: { title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
		editLink: vi
			.fn<(linkId: string, input: { title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
		removeLink: vi.fn<(linkId: string) => Promise<void>>().mockResolvedValue(undefined),
		openLink: vi
			.fn<(link: { id: string; title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
	},
}))

const mockEntityDetailController = vi.hoisted(() => ({
	value: {
		openPage: vi.fn<(target: { kind: 'task'; id: string }) => void>(),
	},
}))

vi.mock('../model/useTaskDetailController', () => ({
	useTaskDetailController: () => mockDetailController.value,
}))

vi.mock('../model/useTaskAutosaveAdapter', () => ({
	useTaskAutosaveAdapter: () => mockAutosave.value,
}))

vi.mock('@/features/project', () => ({
	useProjectOptions: () => [
		{
			id: 'project-1',
			name: '项目 A',
			spaceId: 'space-1',
		},
		{
			id: 'project-2',
			name: '项目 B',
			spaceId: 'space-2',
		},
	],
}))

vi.mock('@/features/space', () => ({
	useSpaces: () => ({
		spaces: [
			{
				id: 'space-1',
				name: '工作',
				iconKey: 'briefcase',
				colorKey: 'blue',
				isDefault: true,
				position: 1,
				archivedAt: null,
				deletedAt: null,
				createdAt: '2026-05-19T00:00:00Z',
				updatedAt: '2026-05-19T00:00:00Z',
			},
			{
				id: 'space-2',
				name: '生活',
				iconKey: 'home',
				colorKey: 'green',
				isDefault: false,
				position: 2,
				archivedAt: null,
				deletedAt: null,
				createdAt: '2026-05-19T00:00:00Z',
				updatedAt: '2026-05-19T00:00:00Z',
			},
		],
		status: 'ready',
		error: null,
		refetch: vi.fn(),
	}),
}))

vi.mock('../model/useTaskLinksController', () => ({
	useTaskLinksController: () => mockTaskLinksController.value,
}))

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => mockEntityDetailController.value,
}))

vi.mock('@/features/activity', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/activity')>()
	return {
		...actual,
		getEntityActivities: getEntityActivitiesMock,
		useEntityActivitiesQuery: (
			input: { entityType: string; entityId: string; limit?: number } | null,
		) => {
			if (input) {
				void getEntityActivitiesMock(input)
			}
			const data = getEntityActivitiesMock.mock.results.at(-1)?.value
			return {
				data: Array.isArray(data) ? data : [],
				isError: false,
				isLoading: false,
				isPending: false,
				isFetching: false,
				error: null,
				refetch: () => getEntityActivitiesMock(input),
			}
		},
	}
})

describe('TaskDetailContent', () => {
	beforeEach(() => {
		mockDetailController.value = {
			task: createTaskDetail(),
			status: 'ready',
			error: null,
			archiveOrRestore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			moveToTrash: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		}
		mockAutosave.value = createAutosaveController()
		mockTaskLinksController.value = {
			links: [],
			status: 'ready',
			error: null,
			reloadLinks: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			addLink: vi
				.fn<(input: { title: string; url: string }) => Promise<void>>()
				.mockResolvedValue(undefined),
			editLink: vi
				.fn<(linkId: string, input: { title: string; url: string }) => Promise<void>>()
				.mockResolvedValue(undefined),
			removeLink: vi.fn<(linkId: string) => Promise<void>>().mockResolvedValue(undefined),
			openLink: vi
				.fn<(link: { id: string; title: string; url: string }) => Promise<void>>()
				.mockResolvedValue(undefined),
		}
		getEntityActivitiesMock.mockResolvedValue([])
		getEntityActivitiesMock.mockClear()
		mockEntityDetailController.value = {
			openPage: vi.fn<(target: { kind: 'task'; id: string }) => void>(),
		}
	})

	it('加载时显示加载态', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'loading',
		}

		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('加载中...')).toBeInTheDocument()
	})

	it('不存在和错误时有稳定空态', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'error',
			error: '任务详情加载失败',
		}

		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('任务详情加载失败')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
	})

	it('不渲染动态页签和手动保存按钮', () => {
		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		expect(screen.queryByRole('button', { name: '动态' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
		expect(getEntityActivitiesMock).not.toHaveBeenCalled()
	})

	it('头部显示任务详情、保存状态和打开动作', () => {
		const { container } = renderTaskDetailContent(
			<TaskDetailHarness onClose={() => undefined} taskId='task-1' />,
		)

		expect(screen.getByText('任务详情')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '打开' })).toHaveClass('button--outline')
		expect(screen.queryByRole('button', { name: '更多任务操作' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '关闭任务详情' })).not.toBeInTheDocument()
		expect(container.querySelector('[data-task-detail-body="true"]')).toContainElement(
			screen.getByLabelText('任务标题'),
		)
		expect(container.querySelector('[data-detail-drawer-shell="true"]')).not.toBeInTheDocument()
	})

	it('正文按文档顺序渲染标题、备注、属性、归属和链接', () => {
		const { container } = renderTaskDetailContent(
			<TaskDetailHarness onClose={() => undefined} taskId='task-1' />,
		)
		const body = container.querySelector('[data-task-detail-body="true"]')

		expect(body).toBeInTheDocument()
		expect(screen.getByLabelText('任务标题')).toHaveClass('border-0')
		expect(screen.getByLabelText('任务备注')).toHaveClass('border-0')
		expect(screen.getByLabelText('任务备注')).toHaveClass('min-h-40')
		// 属性、归属使用 DetailFieldRow label-value 布局，不再是 h3 heading
		expect(container.querySelector('[data-task-properties="stack"]')).toBeInTheDocument()
		expect(screen.getByText('归属')).toBeInTheDocument()
		expect(screen.queryByText('项目')).not.toBeInTheDocument()
		expect(screen.queryByText('标签')).not.toBeInTheDocument()
		// 链接仍然是独立 section，保留 heading
		expect(screen.getByRole('heading', { name: '链接' })).toBeInTheDocument()
	})

	it('归属 dropdown 使用 grouped placement menu', async () => {
		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))

		const menu = await screen.findByRole('menu')
		expect(menu).toHaveAttribute('data-drawer-owned-overlay', 'true')
		expect(screen.getByText('工作')).toBeInTheDocument()
		expect(screen.getAllByRole('menuitem', { name: /独立事项/ })).toHaveLength(2)
	})

	it('链接区块不会接管 autosave', () => {
		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByRole('button', { name: '添加链接' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(mockAutosave.value.setField).not.toHaveBeenCalled()
		expect(mockAutosave.value.setDraft).not.toHaveBeenCalled()
	})

	it('头部展示保存状态和失败信息', () => {
		mockAutosave.value = createAutosaveController({
			status: 'failed',
			error: '网络错误',
		})

		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('保存失败')).toBeInTheDocument()
		expect(screen.getByText('网络错误')).toBeInTheDocument()
	})

	it('底部展示更新时间、归档和移入回收站', () => {
		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		const updatedAt = screen.getByText(/^更新于 /)
		expect(updatedAt).toBeInTheDocument()
		expect(updatedAt.closest('[data-slot="overflow-tooltip-trigger"]')).toHaveTextContent('更新于')
		expect(screen.getByRole('button', { name: '归档' })).toHaveAttribute('data-variant', 'outline')
		expect(screen.getByRole('button', { name: '移入回收站' })).toHaveAttribute(
			'data-variant',
			'destructive',
		)
	})

	it('归档和恢复走控制器动作', async () => {
		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '归档' }))

		await waitFor(() => {
			expect(mockAutosave.value.flushNow).toHaveBeenCalledTimes(1)
			expect(mockDetailController.value.archiveOrRestore).toHaveBeenCalledTimes(1)
		})
	})

	it('移入回收站前触发 flushNow 并走控制器动作', async () => {
		const onClose = vi.fn<() => void>()
		renderWithRouter(<TaskDetailHarness onClose={onClose} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '移入回收站' }))

		await waitFor(() => {
			expect(mockAutosave.value.flushNow).toHaveBeenCalledTimes(1)
			expect(mockDetailController.value.moveToTrash).toHaveBeenCalledTimes(1)
			expect(onClose).toHaveBeenCalledTimes(1)
		})
	})

	it('打开独立页面前先 flush 再导航', async () => {
		renderWithRouter(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '打开' }))

		await waitFor(() => {
			expect(mockAutosave.value.flushNow).toHaveBeenCalledTimes(1)
			expect(mockEntityDetailController.value.openPage).toHaveBeenCalledWith({
				kind: 'task',
				id: 'task-1',
			})
		})
	})

	it('把真实滚动 viewport ref 交给宿主', () => {
		const scrollRef = createRef<HTMLDivElement>()

		renderTaskDetailContent(
			<TaskDetailHarness onClose={() => undefined} scrollRef={scrollRef} taskId='task-1' />,
		)

		expect(scrollRef.current).toHaveAttribute('data-scroll-container', 'true')
	})
})

function TaskDetailHarness({
	taskId,
	onClose,
	scrollRef,
}: {
	taskId: string
	onClose: () => void
	scrollRef?: React.Ref<HTMLDivElement>
}) {
	const viewModel = useTaskDetailViewModel({ taskId, onClose })

	return <TaskDetailContent onClose={onClose} scrollRef={scrollRef} viewModel={viewModel} />
}

function renderWithRouter(node: React.ReactNode) {
	return renderTaskDetailContent(node)
}

function renderTaskDetailContent(node: React.ReactNode) {
	return render(
		<ShortcutRegistryProvider registry={testShortcutRegistry}>{node}</ShortcutRegistryProvider>,
	)
}

const testShortcutRegistry = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...TASK_ROW_SHORTCUT_BINDINGS,
])

function createAutosaveController(
	overrides: Partial<AutosaveController<TaskDetailDraft>> = {},
): AutosaveController<TaskDetailDraft> {
	return {
		draft: {
			id: 'task-1',
			title: '任务 A',
			note: '',
			status: 'todo',
			priority: 2,
			spaceId: 'space-1',
			projectId: '',
			dueAt: '',
			plannedAt: '',
			remindAt: '',
		},
		status: 'idle',
		error: null,
		savedAt: null,
		isDirty: false,
		setField: vi.fn<AutosaveController<TaskDetailDraft>['setField']>(),
		setDraft: vi.fn<AutosaveController<TaskDetailDraft>['setDraft']>(),
		flushNow: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
		retry: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		discard: vi.fn<() => void>(),
		reset: vi.fn<AutosaveController<TaskDetailDraft>['reset']>(),
		...overrides,
	}
}

function createTaskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		title: '任务 A',
		note: '',
		status: 'todo',
		statusChangedAt: '2026-05-19T00:00:00Z',
		priority: 2,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-19T00:00:00Z',
		updatedAt: '2026-05-19T00:00:00Z',
		position: 100,
		deletedAt: null,
		...overrides,
	}
}
