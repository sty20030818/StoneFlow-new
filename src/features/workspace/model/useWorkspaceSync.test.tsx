import { renderHook } from '@testing-library/react'

import { useWorkspaceSync } from '@/features/workspace/model/useWorkspaceSync'
import type { AppEvent } from '@/shared/events'

const projectState = {
	detail: { projectId: 'project-1' },
	sidebar: { scope: { type: 'space' as const, spaceId: 'space-1' } },
	overview: { scope: { type: 'all' as const }, viewKey: 'active' as const },
	loadDetail: vi.fn<(projectId: string) => Promise<void>>(),
	loadSidebar: vi.fn<(scope: { type: 'space'; spaceId: string }) => Promise<void>>(),
	loadOverview: vi.fn<(scope: { type: 'all' }, viewKey: 'active') => Promise<void>>(),
}

const taskState = {
	refreshLoadedSlices: vi.fn<() => Promise<void>>(),
}

const taskChangedHandlers: Array<(payload: unknown) => void> = []
const eventHandlers = new Map<string, (event: AppEvent) => void>()

vi.mock('@/shared/events', () => ({
	useTaskChangedListener: vi.fn<(scope: unknown, handler: (payload: unknown) => void) => void>(
		(_scope, handler) => {
			taskChangedHandlers.push(handler)
		},
	),
	useEventSubscription: vi.fn<(type: string, handler: (event: AppEvent) => void) => void>(
		(type, handler) => {
			eventHandlers.set(type, handler)
		},
	),
}))

vi.mock('@/features/project/model/useProjectStore', () => ({
	useProjectStore: {
		getState: () => projectState,
	},
}))

vi.mock('@/features/task/model/useTaskStore', () => ({
	useTaskStore: {
		getState: () => taskState,
	},
}))

describe('useWorkspaceSync', () => {
	beforeEach(() => {
		taskChangedHandlers.length = 0
		eventHandlers.clear()
		taskState.refreshLoadedSlices.mockReset()
		projectState.loadDetail.mockReset()
		projectState.loadSidebar.mockReset()
		projectState.loadOverview.mockReset()
		taskState.refreshLoadedSlices.mockResolvedValue()
		projectState.loadDetail.mockResolvedValue()
		projectState.loadSidebar.mockResolvedValue()
		projectState.loadOverview.mockResolvedValue()
	})

	it('收到任务变更事件后刷新当前 Task 与 Project 切片', () => {
		renderHook(() => useWorkspaceSync({ type: 'space', spaceId: 'space-1' }))

		taskChangedHandlers[0]?.({
			taskId: 'task-1',
		})

		expect(taskState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(projectState.loadDetail).toHaveBeenCalledWith('project-1')
		expect(projectState.loadSidebar).toHaveBeenCalledWith({ type: 'space', spaceId: 'space-1' })
		expect(projectState.loadOverview).toHaveBeenCalledWith({ type: 'all' }, 'active')
	})

	it('收到前端内部 task 事件时也会走同一套刷新逻辑', () => {
		renderHook(() => useWorkspaceSync({ type: 'all' }))

		eventHandlers.get('task:updated')?.({
			type: 'task:updated',
			payload: { taskId: 'task-2' },
		})

		expect(taskState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(projectState.loadDetail).toHaveBeenCalledWith('project-1')
		expect(projectState.loadSidebar).toHaveBeenCalledWith({ type: 'space', spaceId: 'space-1' })
		expect(projectState.loadOverview).toHaveBeenCalledWith({ type: 'all' }, 'active')
	})
})
