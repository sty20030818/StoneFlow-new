import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'
import type { TaskDetail } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPage } from './TaskPage'

const getEntityActivitiesMock = vi.hoisted(() => vi.fn<() => Promise<unknown[]>>())

const mockAutosave = vi.hoisted(() => ({
	value: createAutosaveController(),
}))

const taskDetailQueryState = vi.hoisted(() => ({
	data: createTaskDetail(),
}))

vi.mock('@/features/task/query/task.queries', () => ({
	useSuspenseTaskDetailQuery: () => ({
		data: taskDetailQueryState.data,
	}),
}))

vi.mock('../model/useTaskAutosaveAdapter', () => ({
	useTaskAutosaveAdapter: () => mockAutosave.value,
}))

vi.mock('@/features/project/query', () => ({
	useProjectOptions: () => [],
}))

vi.mock('@/features/space/query', () => ({
	useSpaces: () => ({
		spaces: [
			{
				id: 'space-1',
				name: '工作',
				iconKey: 'briefcase',
				colorKey: 'blue',
				isDefault: true,
				sortOrder: 1,
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

vi.mock('../ui/TaskLinksSection', () => ({
	TaskLinksSection: ({ taskId }: { taskId: string }) => <div>Links for {taskId}</div>,
}))

vi.mock('@/features/activity/api/getEntityActivities', () => ({
	getEntityActivities: getEntityActivitiesMock,
}))

describe('TaskPage', () => {
	beforeEach(() => {
		taskDetailQueryState.data = createTaskDetail()
		mockAutosave.value = createAutosaveController()
		getEntityActivitiesMock.mockResolvedValue([])
		getEntityActivitiesMock.mockClear()
	})

	it('展示 task page 主体和 activity empty state', async () => {
		renderTaskPage()

		expect(screen.getByText('任务 A')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '独立事项' })).toBeInTheDocument()
		expect(screen.getByText('Links for task-1')).toBeInTheDocument()
		expect(screen.getAllByText('归属').length).toBeGreaterThan(0)
		expect(screen.getAllByText('空间').length).toBeGreaterThan(0)
		expect(screen.getAllByText('项目').length).toBeGreaterThan(0)

		await waitFor(() => {
			expect(getEntityActivitiesMock).toHaveBeenCalledWith({
				entityType: 'task',
				entityId: 'task-1',
				limit: 10,
			})
		})

		expect(await screen.findByText('暂无 Activity')).toBeInTheDocument()
	})

	it('归属区只保留一个 placement 入口，并继续保留详情只读空间和项目', async () => {
		renderTaskPage()

		expect(screen.getAllByRole('button', { name: '归属' })).toHaveLength(1)
		expect(screen.queryByRole('button', { name: '空间' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '项目' })).not.toBeInTheDocument()

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))

		expect(await screen.findByRole('menuitem', { name: /独立事项/ })).toBeInTheDocument()
		expect(screen.getAllByText('空间').length).toBeGreaterThan(0)
		expect(screen.getAllByText('项目').length).toBeGreaterThan(0)
	})

	it('项目任务显示项目链路，收件箱任务显示收件箱链路', () => {
		taskDetailQueryState.data = createTaskDetail({
			projectId: 'project-1',
			projectName: '项目 A',
		})

		const view = renderTaskPage()
		expect(screen.getByRole('link', { name: '项目总览' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '项目 A' })).toBeInTheDocument()

		taskDetailQueryState.data = createTaskDetail({
			projectId: null,
			projectName: null,
			inboxAt: '2026-05-19T00:00:00Z',
		})

		view.rerender(renderTaskPageElement())
		expect(screen.getByRole('link', { name: '收件箱' })).toBeInTheDocument()
	})

	it('真实详情数据直接驱动页面，不依赖 fallback draft', async () => {
		taskDetailQueryState.data = createTaskDetail({
			title: '真实任务标题',
			note: '真实任务备注',
			status: 'doing',
			priority: 4,
			dueAt: '2026-05-30',
			scheduledAt: '2026-05-29',
			reminderAt: '2026-05-28',
			projectId: 'project-1',
			projectName: '项目 A',
		})

		renderTaskPage()

		expect(await screen.findByText('真实任务标题')).toBeInTheDocument()
		expect(screen.getByText('Links for task-1')).toBeInTheDocument()
		expect(mockAutosave.value.reset).not.toHaveBeenCalled()
	})

	it('trash 任务显示只读状态', () => {
		taskDetailQueryState.data = createTaskDetail({
			deletedAt: '2026-05-24T00:00:00Z',
		})

		renderTaskPage()

		expect(screen.getByText('回收站中的任务')).toBeInTheDocument()
		expect(screen.getByLabelText('任务标题')).toBeDisabled()
		expect(screen.getByLabelText('任务备注')).toBeDisabled()
	})
})

function renderTaskPage() {
	return render(renderTaskPageElement())
}

function renderTaskPageElement(): ReactElement {
	return (
		<QueryClientProvider client={createTestQueryClient()}>
			<MemoryRouter>
				<Suspense fallback={<div>loading</div>}>
					<TaskPage scope={{ type: 'space', spaceId: 'space-1' }} taskId='task-1' />
				</Suspense>
			</MemoryRouter>
		</QueryClientProvider>
	)
}

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
}

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
			inboxAt: '',
			dueAt: '',
			scheduledAt: '',
			reminderAt: '',
		},
		status: 'idle',
		error: null,
		savedAt: null,
		isDirty: false,
		setField: vi.fn<AutosaveController<TaskDetailDraft>['setField']>(),
		setDraft: vi.fn<AutosaveController<TaskDetailDraft>['setDraft']>(),
		flushNow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
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
		inboxAt: null,
		title: '任务 A',
		note: '',
		status: 'todo',
		statusChangedAt: '2026-05-19T00:00:00Z',
		priority: 2,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-19T00:00:00Z',
		updatedAt: '2026-05-19T00:00:00Z',
		sortOrder: 100,
		deletedAt: null,
		...overrides,
	}
}
