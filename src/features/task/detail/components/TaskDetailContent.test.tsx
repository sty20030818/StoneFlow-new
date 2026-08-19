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

vi.mock('@/features/activity', () => ({
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
}))

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

	it('在加载和错误阶段提供稳定反馈', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'loading',
		}
		const loading = renderTaskDetailContent(
			<TaskDetailHarness onClose={() => undefined} taskId='task-1' />,
		)
		expect(screen.getByText('加载中...')).toBeInTheDocument()
		loading.unmount()

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

	it('组合可编辑正文，并把属性选择交给 autosave', async () => {
		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('任务详情')).toBeInTheDocument()
		expect(screen.getByLabelText('任务标题')).toBeInTheDocument()
		expect(screen.getByLabelText('任务备注')).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: '链接' })).toBeInTheDocument()

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /进行中/ }))
		expect(mockAutosave.value.setField).toHaveBeenCalledWith('status', 'doing', {
			saveMode: 'immediate',
		})
	})

	it('展示 autosave 失败状态而不丢失草稿', () => {
		mockAutosave.value = createAutosaveController({ status: 'failed', error: '网络错误' })

		renderTaskDetailContent(<TaskDetailHarness onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('保存失败')).toBeInTheDocument()
		expect(screen.getByText('网络错误')).toBeInTheDocument()
		expect(screen.getByLabelText('任务标题')).toHaveValue('任务 A')
	})

	it('移入回收站前 flush，并在成功后关闭详情', async () => {
		const onClose = vi.fn<() => void>()
		renderTaskDetailContent(<TaskDetailHarness onClose={onClose} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '移入回收站' }))

		await waitFor(() => {
			expect(mockAutosave.value.flushNow).toHaveBeenCalledOnce()
			expect(mockDetailController.value.moveToTrash).toHaveBeenCalledOnce()
			expect(onClose).toHaveBeenCalledOnce()
		})
	})

	it('把承载正文的真实滚动 viewport 交给宿主', () => {
		const scrollRef = createRef<HTMLDivElement>()

		renderTaskDetailContent(
			<TaskDetailHarness onClose={() => undefined} scrollRef={scrollRef} taskId='task-1' />,
		)

		expect(scrollRef.current).toBeInstanceOf(HTMLDivElement)
		expect(scrollRef.current).toContainElement(screen.getByLabelText('任务标题'))
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
