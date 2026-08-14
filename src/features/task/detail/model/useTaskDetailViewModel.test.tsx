import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'
import type { TaskDetail } from '@/shared/types'

import type { TaskDetailDraft } from './taskDetailDraft'
import { useTaskDetailViewModel } from './useTaskDetailViewModel'

const detailController = vi.hoisted(() => ({
	value: {
		task: null as TaskDetail | null,
		status: 'ready' as const,
		error: null,
		archiveOrRestore: vi.fn<() => Promise<void>>(),
		moveToTrash: vi.fn<() => Promise<void>>(),
	},
}))
const autosaveAdapter = vi.hoisted(() => ({
	value: null as unknown as AutosaveController<TaskDetailDraft>,
}))

vi.mock('./useTaskDetailController', () => ({
	useTaskDetailController: () => detailController.value,
}))

vi.mock('./useTaskAutosaveAdapter', () => ({
	useTaskAutosaveAdapter: () => autosaveAdapter.value,
}))

vi.mock('@/features/project', () => ({
	useProjectOptions: () => [],
}))

vi.mock('@/features/space', () => ({
	useSpaces: () => ({ spaces: [] }),
}))

describe('useTaskDetailViewModel', () => {
	beforeEach(() => {
		detailController.value = {
			task: createTaskDetail(),
			status: 'ready',
			error: null,
			archiveOrRestore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			moveToTrash: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		}
		autosaveAdapter.value = createAutosaveController()
	})

	it('本地 draft 未保存时忽略同任务的远端刷新', () => {
		const { rerender } = renderViewModel()
		vi.mocked(autosaveAdapter.value.reset).mockClear()

		autosaveAdapter.value.isDirty = true
		detailController.value = {
			...detailController.value,
			task: createTaskDetail({ title: '远端标题响应' }),
		}
		rerender({ taskId: 'task-1' })

		expect(autosaveAdapter.value.reset).not.toHaveBeenCalled()
	})

	it('本地 draft 干净时接收同任务的远端刷新', () => {
		const { rerender } = renderViewModel()
		vi.mocked(autosaveAdapter.value.reset).mockClear()

		detailController.value = {
			...detailController.value,
			task: createTaskDetail({ note: '远端备注' }),
		}
		rerender({ taskId: 'task-1' })

		expect(autosaveAdapter.value.reset).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'task-1', note: '远端备注' }),
		)
	})

	it('切换任务时先 flush 当前 draft 再 reset 新任务', async () => {
		const { rerender } = renderViewModel()
		vi.mocked(autosaveAdapter.value.flushNow).mockClear()
		vi.mocked(autosaveAdapter.value.reset).mockClear()
		autosaveAdapter.value.isDirty = true

		detailController.value = {
			...detailController.value,
			task: createTaskDetail({ id: 'task-2', title: '任务 B' }),
		}
		rerender({ taskId: 'task-2' })

		expect(autosaveAdapter.value.flushNow).toHaveBeenCalledTimes(1)
		await waitFor(() => {
			expect(autosaveAdapter.value.reset).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'task-2', title: '任务 B' }),
			)
		})
		expect(vi.mocked(autosaveAdapter.value.flushNow).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(autosaveAdapter.value.reset).mock.invocationCallOrder[0] ??
				Number.POSITIVE_INFINITY,
		)
	})
})

function renderViewModel() {
	return renderHook(
		({ taskId }: { taskId: string }) =>
			useTaskDetailViewModel({ taskId, onClose: () => undefined }),
		{ initialProps: { taskId: 'task-1' } },
	)
}

function createAutosaveController(): AutosaveController<TaskDetailDraft> {
	return {
		draft: createDraft(),
		status: 'idle',
		error: null,
		savedAt: null,
		isDirty: false,
		setField: vi.fn(),
		setDraft: vi.fn(),
		flushNow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		retry: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		discard: vi.fn(),
		reset: vi.fn(),
	}
}

function createDraft(): TaskDetailDraft {
	return {
		id: 'task-1',
		title: '任务 A',
		note: '',
		status: 'todo',
		priority: 0,
		spaceId: 'space-1',
		projectId: '',
		dueAt: '',
		plannedAt: '',
		remindAt: '',
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
		statusChangedAt: '2026-08-14T00:00:00Z',
		priority: 0,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-08-14T00:00:00Z',
		updatedAt: '2026-08-14T00:00:00Z',
		position: 0,
		deletedAt: null,
		...overrides,
	}
}
