import { act, renderHook } from '@testing-library/react'

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

const spaceState = {
	load: vi.fn<() => Promise<void>>(),
}

const lifecycleState = {
	refreshLoadedSlices: vi.fn<() => Promise<void>>(),
}

const viewState = {
	refreshTaskRun: vi.fn<() => Promise<void>>(),
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

vi.mock('@/features/space/model/useSpaceStore', () => ({
	useSpaceStore: {
		getState: () => spaceState,
	},
}))

vi.mock('@/features/lifecycle/model/useLifecycleStore', () => ({
	useLifecycleStore: {
		getState: () => lifecycleState,
	},
}))

vi.mock('@/features/view/model/useViewStore', () => ({
	useViewStore: {
		getState: () => viewState,
	},
}))

describe('useWorkspaceSync', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		taskChangedHandlers.length = 0
		eventHandlers.clear()
		taskState.refreshLoadedSlices.mockReset()
		projectState.loadDetail.mockReset()
		projectState.loadSidebar.mockReset()
		projectState.loadOverview.mockReset()
		spaceState.load.mockReset()
		lifecycleState.refreshLoadedSlices.mockReset()
		viewState.refreshTaskRun.mockReset()
		taskState.refreshLoadedSlices.mockResolvedValue()
		projectState.loadDetail.mockResolvedValue()
		projectState.loadSidebar.mockResolvedValue()
		projectState.loadOverview.mockResolvedValue()
		spaceState.load.mockResolvedValue()
		lifecycleState.refreshLoadedSlices.mockResolvedValue()
		viewState.refreshTaskRun.mockResolvedValue()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('收到任务变更事件后刷新当前 Task 与 Project 切片', () => {
		renderHook(() => useWorkspaceSync({ type: 'space', spaceId: 'space-1' }))

		act(() => {
			taskChangedHandlers[0]?.({
				taskId: 'task-1',
			})
			vi.advanceTimersByTime(80)
		})

		expect(taskState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(projectState.loadDetail).toHaveBeenCalledWith('project-1')
		expect(projectState.loadSidebar).toHaveBeenCalledWith({ type: 'space', spaceId: 'space-1' })
		expect(projectState.loadOverview).toHaveBeenCalledWith({ type: 'all' }, 'active')
		expect(spaceState.load).toHaveBeenCalledTimes(1)
		expect(lifecycleState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(viewState.refreshTaskRun).toHaveBeenCalledTimes(1)
	})

	it('收到前端内部 task 事件时也会走同一套刷新逻辑', () => {
		renderHook(() => useWorkspaceSync({ type: 'all' }))

		act(() => {
			eventHandlers.get('task:updated')?.({
				type: 'task:updated',
				payload: { taskId: 'task-2' },
			})
			vi.advanceTimersByTime(80)
		})

		expect(taskState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(projectState.loadDetail).toHaveBeenCalledWith('project-1')
		expect(projectState.loadSidebar).toHaveBeenCalledWith({ type: 'space', spaceId: 'space-1' })
		expect(projectState.loadOverview).toHaveBeenCalledWith({ type: 'all' }, 'active')
		expect(spaceState.load).toHaveBeenCalledTimes(1)
		expect(lifecycleState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(viewState.refreshTaskRun).toHaveBeenCalledTimes(1)
	})

	it('收到 lifecycle 事件时也会刷新 Space、View 与生命周期切片', () => {
		renderHook(() => useWorkspaceSync({ type: 'all' }))

		act(() => {
			eventHandlers.get('lifecycle:changed')?.({
				type: 'lifecycle:changed',
				payload: { entityType: 'project', entityId: 'project-1' },
			})
			vi.advanceTimersByTime(80)
		})

		expect(taskState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(spaceState.load).toHaveBeenCalledTimes(1)
		expect(lifecycleState.refreshLoadedSlices).toHaveBeenCalledTimes(1)
		expect(viewState.refreshTaskRun).toHaveBeenCalledTimes(1)
	})
})
