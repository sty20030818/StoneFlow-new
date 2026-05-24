import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'
import type { TaskDetail } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPage } from './TaskPage'

const getEntityActivitiesMock = vi.hoisted(() => vi.fn<() => Promise<unknown[]>>())

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

vi.mock('../model/useTaskDetailController', () => ({
	useTaskDetailController: () => mockDetailController.value,
}))

vi.mock('../model/useTaskAutosaveAdapter', () => ({
	useTaskAutosaveAdapter: () => mockAutosave.value,
}))

vi.mock('@/features/project/model/useProjectStore', () => ({
	selectProjectOptions: () => [],
	useProjectStore: () => [],
}))

vi.mock('../ui/TaskLinksSection', () => ({
	TaskLinksSection: ({ taskId }: { taskId: string }) => <div>Links for {taskId}</div>,
}))

vi.mock('@/features/activity/api/getEntityActivities', () => ({
	getEntityActivities: getEntityActivitiesMock,
}))

describe('TaskPage', () => {
	beforeEach(() => {
		mockDetailController.value = {
			task: createTaskDetail(),
			status: 'ready',
			error: null,
			archiveOrRestore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			moveToTrash: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		}
		mockAutosave.value = createAutosaveController()
		getEntityActivitiesMock.mockResolvedValue([])
		getEntityActivitiesMock.mockClear()
	})

	it('详情加载中时显示 page loading 状态', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'loading',
		}

		renderTaskPage()

		expect(screen.getByText('加载中')).toBeInTheDocument()
		expect(screen.getByText('正在读取任务详情。')).toBeInTheDocument()
	})

	it('not found 时展示返回列表入口', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'ready',
		}

		renderTaskPage()

		expect(screen.getByText('任务不存在')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '返回任务列表' })).toBeInTheDocument()
	})

	it('展示 task page 主体和 activity empty state', async () => {
		renderTaskPage()

		expect(screen.getByText('任务 A')).toBeInTheDocument()
		expect(screen.getByText('Links for task-1')).toBeInTheDocument()

		await waitFor(() => {
			expect(getEntityActivitiesMock).toHaveBeenCalledWith({
				entityType: 'task',
				entityId: 'task-1',
				limit: 50,
			})
		})

		expect(await screen.findByText('暂无 Activity')).toBeInTheDocument()
	})

	it('trash 任务显示只读状态', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: createTaskDetail({
				deletedAt: '2026-05-24T00:00:00Z',
			}),
		}

		renderTaskPage()

		expect(screen.getByText('回收站中的任务')).toBeInTheDocument()
		expect(screen.getByLabelText('任务标题')).toBeDisabled()
		expect(screen.getByLabelText('任务备注')).toBeDisabled()
	})
})

function renderTaskPage() {
	return render(
		<MemoryRouter>
			<TaskPage scope={{ type: 'space', spaceId: 'space-1' }} taskId='task-1' />
		</MemoryRouter>,
	)
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
