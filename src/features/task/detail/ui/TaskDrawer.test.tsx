import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'
import type { TaskDetail } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskDrawer } from './TaskDrawer'

const getEntityActivitiesMock = vi.hoisted(() => vi.fn<() => Promise<unknown[]>>())
const mockDetailController = vi.hoisted(() => ({
	value: {
		task: null as TaskDetail | null,
		status: 'loading' as 'idle' | 'loading' | 'ready' | 'error',
		error: null as string | null,
		archiveOrRestore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
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

vi.mock('@/features/activity/api/getEntityActivities', () => ({
	getEntityActivities: getEntityActivitiesMock,
}))

describe('TaskDrawer', () => {
	beforeEach(() => {
		mockDetailController.value = {
			task: createTaskDetail(),
			status: 'ready',
			error: null,
			archiveOrRestore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		}
		mockAutosave.value = createAutosaveController()
		getEntityActivitiesMock.mockResolvedValue([])
		getEntityActivitiesMock.mockClear()
	})

	it('加载时显示 loading', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'loading',
		}

		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('加载中...')).toBeInTheDocument()
	})

	it('not found/error 有稳定空态', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'error',
			error: '任务详情加载失败',
		}

		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('任务详情加载失败')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
	})

	it('不渲染 Activity tab 和手动保存按钮', () => {
		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.queryByRole('button', { name: '动态' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
		expect(getEntityActivitiesMock).not.toHaveBeenCalled()
	})

	it('关闭前触发 flushNow', async () => {
		const onClose = vi.fn<() => void>()
		render(<TaskDrawer onClose={onClose} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '关闭任务详情' }))

		await waitFor(() => {
			expect(mockAutosave.value.flushNow).toHaveBeenCalledTimes(1)
			expect(onClose).toHaveBeenCalledTimes(1)
		})
	})

	it('Footer 展示保存状态和失败重试', () => {
		mockAutosave.value = createAutosaveController({
			status: 'failed',
			error: '保存失败',
		})

		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('Save failed')).toBeInTheDocument()
		expect(screen.getByText('保存失败')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		expect(mockAutosave.value.retry).toHaveBeenCalledTimes(1)
	})

	it('archive/restore 走 controller action', async () => {
		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '归档' }))

		await waitFor(() => {
			expect(mockAutosave.value.flushNow).toHaveBeenCalledTimes(1)
			expect(mockDetailController.value.archiveOrRestore).toHaveBeenCalledTimes(1)
		})
	})
})

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
