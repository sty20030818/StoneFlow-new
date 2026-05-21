import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectOption } from '@/features/project/model/types'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import type { TaskDetail } from '@/shared/types'

import {
	applyTaskProjectDraftChange,
	applyTaskSpaceDraftChange,
	createTaskDetailDraft,
} from './taskDetailDraft'
import { useTaskAutosaveAdapter } from './useTaskAutosaveAdapter'

describe('useTaskAutosaveAdapter', () => {
	const baseTask = createTaskDetail()
	type UpdateTask = ReturnType<typeof useTaskStore.getState>['updateTask']

	beforeEach(() => {
		vi.useFakeTimers()
		useTaskStore.setState((state) => ({
			...state,
			updateTask: vi.fn<UpdateTask>(async (input) => ({
				...baseTask,
				...('title' in input ? { title: input.title ?? baseTask.title } : {}),
				...('note' in input ? { note: input.note ?? null } : {}),
				...('status' in input ? { status: input.status ?? baseTask.status } : {}),
				...('priority' in input ? { priority: input.priority ?? baseTask.priority } : {}),
				...('spaceId' in input ? { spaceId: input.spaceId ?? baseTask.spaceId } : {}),
				...('projectId' in input ? { projectId: input.projectId ?? null } : {}),
				...('dueAt' in input ? { dueAt: input.dueAt ?? null } : {}),
			})),
		}))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('标题和备注 debounce 后保存', async () => {
		const { result } = renderHook(() =>
			useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
		)

		act(() => {
			result.current.setField('title', '  新标题  ', { saveMode: 'debounced' })
			result.current.setField('note', '  新备注  ', { saveMode: 'debounced' })
		})

		expect(updateTaskMock()).not.toHaveBeenCalled()

		await act(async () => {
			vi.advanceTimersByTime(600)
			await Promise.resolve()
		})

		expect(updateTaskMock()).toHaveBeenCalledWith({
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
		})

		act(() => {
			result.current.setField('note', '\n\n', { saveMode: 'debounced' })
		})

		await act(async () => {
			vi.advanceTimersByTime(600)
			await Promise.resolve()
		})

		expect(updateTaskMock()).toHaveBeenCalledWith({
			taskId: 'task-1',
			note: null,
		})

		updateTaskMock().mockClear()
		rerender({ base: createTaskDetailDraft(baseTask) })

		act(() => {
			result.current.setField('note', '  第一行\n第二行  ', { saveMode: 'debounced' })
		})

		await act(async () => {
			vi.advanceTimersByTime(600)
			await Promise.resolve()
		})

		expect(updateTaskMock()).toHaveBeenCalledWith({
			taskId: 'task-1',
			note: '  第一行\n第二行  ',
		})
	})

	it('状态和优先级立即保存', async () => {
		const { result } = renderHook(() =>
			useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
		)

		await act(async () => {
			result.current.setField('status', 'doing', { saveMode: 'immediate' })
			await Promise.resolve()
		})

		expect(updateTaskMock()).toHaveBeenCalledWith({
			taskId: 'task-1',
			status: 'doing',
		})

		await act(async () => {
			result.current.setField('priority', 4, { saveMode: 'immediate' })
			await Promise.resolve()
		})

		expect(updateTaskMock()).toHaveBeenLastCalledWith({
			taskId: 'task-1',
			priority: 4,
		})
	})

	it('保存返回的新 detail 成为下一次 diff base', async () => {
		const { result } = renderHook(() =>
			useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
		)

		await act(async () => {
			result.current.setField('status', 'doing', { saveMode: 'immediate' })
			await Promise.resolve()
		})

		updateTaskMock().mockClear()

		await act(async () => {
			result.current.setField('status', 'doing', { saveMode: 'immediate' })
			await Promise.resolve()
		})

		expect(updateTaskMock()).not.toHaveBeenCalled()
	})

	it('保存失败保留 draft，并可 retry', async () => {
		updateTaskMock().mockRejectedValueOnce(new Error('boom'))
		const { result } = renderHook(() =>
			useTaskAutosaveAdapter({ base: createTaskDetailDraft(baseTask) }),
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

		expect(updateTaskMock()).toHaveBeenLastCalledWith({
			taskId: 'task-1',
			status: 'doing',
		})
	})

	it('project 变化同步 spaceId，space 变化清理不属于该 space 的 projectId', () => {
		const projects: ProjectOption[] = [
			{ id: 'project-1', name: '项目 1', spaceId: 'space-1' },
			{ id: 'project-2', name: '项目 2', spaceId: 'space-2' },
		]
		const draft = createTaskDetailDraft(baseTask)

		const projectDraft = applyTaskProjectDraftChange(draft, 'project-2', projects)
		expect(projectDraft).toMatchObject({
			projectId: 'project-2',
			spaceId: 'space-2',
		})

		const spaceDraft = applyTaskSpaceDraftChange(projectDraft, 'space-1', projects)
		expect(spaceDraft).toMatchObject({
			projectId: '',
			spaceId: 'space-1',
		})
	})
})

function updateTaskMock() {
	return useTaskStore.getState().updateTask as ReturnType<typeof vi.fn>
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
