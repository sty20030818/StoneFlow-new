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

	it('加载时显示加载态', () => {
		mockDetailController.value = {
			...mockDetailController.value,
			task: null,
			status: 'loading',
		}

		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('加载中...')).toBeInTheDocument()
	})

	it('不存在和错误时有稳定空态', () => {
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

	it('不渲染动态页签和手动保存按钮', () => {
		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.queryByRole('button', { name: '动态' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
		expect(getEntityActivitiesMock).not.toHaveBeenCalled()
	})

	it('标题输入在头部内，头部保留打开、更多、关闭', () => {
		const { container } = render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)
		const titleInput = screen.getByLabelText('任务标题')

		expect(titleInput.closest('[class*="border-b"]')).toContainElement(titleInput)
		expect(screen.getByRole('button', { name: '打开' })).toHaveAttribute('data-variant', 'outline')
		expect(screen.getAllByRole('button', { name: '更多任务操作' })[0]).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(screen.getByRole('button', { name: '关闭任务详情' })).toBeInTheDocument()
		expect(container.querySelector('[data-task-drawer-body="true"]')).not.toContainElement(titleInput)
	})

	it('正文按文档顺序渲染备注、属性、标签、项目、链接', () => {
		const { container } = render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)
		const body = container.querySelector('[data-task-drawer-body="true"]')

		expect(body).toBeInTheDocument()
		expect(screen.getByLabelText('任务备注')).toHaveClass('border-0')
		expect(screen.getByRole('heading', { name: '属性' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: '标签' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: '项目' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: '链接' })).toBeInTheDocument()

		const bodyText = body?.textContent ?? ''
		expect(bodyText.indexOf('属性')).toBeGreaterThan(bodyText.indexOf('添加备注...'))
		expect(bodyText.indexOf('标签')).toBeGreaterThan(bodyText.indexOf('属性'))
		expect(bodyText.indexOf('项目')).toBeGreaterThan(bodyText.indexOf('标签'))
		expect(bodyText.indexOf('链接')).toBeGreaterThan(bodyText.indexOf('项目'))
	})

	it('标签和链接只渲染预留入口', () => {
		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByRole('button', { name: '添加标签' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '添加标签' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(screen.getByRole('button', { name: '添加链接' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(mockAutosave.value.setField).not.toHaveBeenCalled()
		expect(mockAutosave.value.setDraft).not.toHaveBeenCalled()
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

	it('底部展示保存状态和失败重试', () => {
		mockAutosave.value = createAutosaveController({
			status: 'failed',
			error: '网络错误',
		})

		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText('保存失败')).toBeInTheDocument()
		expect(screen.getByText('网络错误')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		expect(mockAutosave.value.retry).toHaveBeenCalledTimes(1)
	})

	it('底部展示更新时间、更多和归档', () => {
		render(<TaskDrawer onClose={() => undefined} taskId='task-1' />)

		expect(screen.getByText(/^更新于 /)).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: '更多任务操作' })[1]).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(screen.getByRole('button', { name: '归档' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
	})

	it('归档和恢复走控制器动作', async () => {
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
