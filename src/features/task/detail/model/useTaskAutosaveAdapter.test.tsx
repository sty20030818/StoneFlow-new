import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import { updateTask } from '@/features/task/api/tasks'
import type { TaskDetail } from '@/shared/types'

import { applyTaskPlacementDraftChange, createTaskDetailDraft } from './taskDetailDraft'
import { useTaskAutosaveAdapter } from './useTaskAutosaveAdapter'

vi.mock('@/features/task/api/tasks', () => ({
	updateTask: vi.fn(),
}))

describe('useTaskAutosaveAdapter', () => {
	const baseTask = createTaskDetail()
	const updateTaskMock = vi.mocked(updateTask)

	beforeEach(() => {
		vi.useFakeTimers()
		updateTaskMock.mockReset()
		updateTaskMock.mockImplementation(async (input) => ({
			...baseTask,
			...('title' in input ? { title: input.title ?? baseTask.title } : {}),
			...('note' in input ? { note: input.note ?? null } : {}),
			...('status' in input ? { status: input.status ?? baseTask.status } : {}),
			...('priority' in input ? { priority: input.priority ?? baseTask.priority } : {}),
			...(input.placement
				? {
						spaceId: input.placement.spaceId,
						projectId:
							input.placement.kind === 'project' ? (input.placement.projectId ?? null) : null,
					}
				: {}),
			...('dueAt' in input ? { dueAt: input.dueAt ?? null } : {}),
		}))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('标题和备注 debounce 后保存', async () => {
		const { result } = renderHook(
			() => useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
			{ wrapper: createQueryWrapper() },
		)

		act(() => {
			result.current.setField('title', '  新标题  ', { saveMode: 'debounced' })
			result.current.setField('note', '  新备注  ', { saveMode: 'debounced' })
		})

		expect(updateTaskMock).not.toHaveBeenCalled()

		await act(async () => {
			vi.advanceTimersByTime(600)
			await Promise.resolve()
		})

		expect(updateTaskMock.mock.calls.at(-1)?.[0]).toEqual({
			taskId: 'task-1',
			title: '新标题',
			note: '  新备注  ',
		})
	})

	it('备注允许为空，并保留非空备注的换行内容', async () => {
		const { result, rerender } = renderHook(({ base }) => useTaskAutosaveAdapter({ base }), {
			initialProps: {
				base: createTaskDetailDraft({
					...baseTask,
					note: '已有备注',
				}),
			},
			wrapper: createQueryWrapper(),
		})

		act(() => {
			result.current.setField('note', '\n\n', { saveMode: 'debounced' })
		})

		await act(async () => {
			vi.advanceTimersByTime(600)
			await Promise.resolve()
		})

		expect(updateTaskMock.mock.calls.at(-1)?.[0]).toEqual({
			taskId: 'task-1',
			note: null,
		})

		updateTaskMock.mockClear()
		rerender({ base: createTaskDetailDraft(baseTask) })

		act(() => {
			result.current.setField('note', '  第一行\n第二行  ', { saveMode: 'debounced' })
		})

		await act(async () => {
			vi.advanceTimersByTime(600)
			await Promise.resolve()
		})

		expect(updateTaskMock.mock.calls.at(-1)?.[0]).toEqual({
			taskId: 'task-1',
			note: '  第一行\n第二行  ',
		})
	})

	it('状态和优先级立即保存', async () => {
		const { result } = renderHook(
			() => useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
			{ wrapper: createQueryWrapper() },
		)

		await act(async () => {
			result.current.setField('status', 'doing', { saveMode: 'immediate' })
			await Promise.resolve()
		})

		expect(updateTaskMock.mock.calls.at(-1)?.[0]).toEqual({
			taskId: 'task-1',
			status: 'doing',
		})

		await act(async () => {
			result.current.setField('priority', 4, { saveMode: 'immediate' })
			await Promise.resolve()
		})

		expect(updateTaskMock.mock.calls.at(-1)?.[0]).toEqual({
			taskId: 'task-1',
			priority: 4,
		})
	})

	it('保存返回的新 detail 成为下一次 diff base', async () => {
		const { result } = renderHook(
			() => useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
			{ wrapper: createQueryWrapper() },
		)

		await act(async () => {
			result.current.setField('status', 'doing', { saveMode: 'immediate' })
			await Promise.resolve()
		})

		updateTaskMock.mockClear()

		await act(async () => {
			result.current.setField('status', 'doing', { saveMode: 'immediate' })
			await Promise.resolve()
		})

		expect(updateTaskMock).not.toHaveBeenCalled()
	})

	it('保存失败保留 draft，并可 retry', async () => {
		updateTaskMock.mockRejectedValueOnce(new Error('boom'))
		const { result } = renderHook(
			() => useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
			{ wrapper: createQueryWrapper() },
		)

		await act(async () => {
			result.current.setField('status', 'doing', { saveMode: 'immediate' })
			await Promise.resolve()
		})

		expect(result.current.draft.status).toBe('doing')
		expect(result.current.status).toBe('failed')

		await act(async () => {
			await result.current.retry()
		})

		expect(updateTaskMock.mock.calls.at(-1)?.[0]).toEqual({
			taskId: 'task-1',
			status: 'doing',
		})
	})

	it('placement 变化同步 spaceId / projectId', () => {
		const draft = createTaskDetailDraft(baseTask)

		const projectDraft = applyTaskPlacementDraftChange(draft, {
			kind: 'project',
			spaceId: 'space-2',
			projectId: 'project-2',
		})
		expect(projectDraft).toMatchObject({
			projectId: 'project-2',
			spaceId: 'space-2',
		})

		const standaloneDraft = applyTaskPlacementDraftChange(projectDraft, {
			kind: 'standalone',
			spaceId: 'space-1',
		})
		expect(standaloneDraft).toMatchObject({
			projectId: '',
			spaceId: 'space-1',
		})
	})
})

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

function createQueryWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})

	return function QueryWrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}
}
