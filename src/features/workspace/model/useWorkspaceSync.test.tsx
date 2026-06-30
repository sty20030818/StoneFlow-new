import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { useWorkspaceSync } from '@/features/workspace/model/useWorkspaceSync'
import type { AppEvent } from '@/shared/events'
import type { Scope } from '@/shared/types'

const taskChangedHandlers: Array<(payload: unknown) => void> = []
const workspaceChangedHandlers: Array<(payload: unknown) => void> = []
const eventHandlers = new Map<string, (event: AppEvent) => void>()
let invalidateQueriesSpy: ReturnType<typeof vi.fn>

vi.mock('@/shared/events', () => ({
	useTaskChangedListener: vi.fn<(scope: unknown, handler: (payload: unknown) => void) => void>(
		(_scope, handler) => {
			taskChangedHandlers.push(handler)
		},
	),
	useWorkspaceChangedListener: vi.fn<(handler: (payload: unknown) => void) => void>((handler) => {
		workspaceChangedHandlers.push(handler)
	}),
	useEventSubscription: vi.fn<(type: string, handler: (event: AppEvent) => void) => void>(
		(type, handler) => {
			eventHandlers.set(type, handler)
		},
	),
}))

describe('useWorkspaceSync', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		taskChangedHandlers.length = 0
		workspaceChangedHandlers.length = 0
		eventHandlers.clear()
		invalidateQueriesSpy = vi.fn().mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('收到任务变更事件后统一失效工作区 Query 缓存', () => {
		expect.hasAssertions()
		renderUseWorkspaceSync()

		act(() => {
			taskChangedHandlers[0]?.({
				taskId: 'task-1',
			})
			vi.advanceTimersByTime(80)
		})

		expectInvalidatedWorkspaceQueries()
	})

	it('收到前端内部 task 事件时也会走同一套刷新逻辑', () => {
		expect.hasAssertions()
		renderUseWorkspaceSync({ type: 'all' })

		act(() => {
			eventHandlers.get('task:updated')?.({
				type: 'task:updated',
				payload: { taskId: 'task-2' },
			})
			vi.advanceTimersByTime(80)
		})

		expectInvalidatedWorkspaceQueries()
	})

	it('收到 lifecycle 事件时也会刷新 Space、View 与生命周期切片', () => {
		expect.hasAssertions()
		renderUseWorkspaceSync({ type: 'all' })

		act(() => {
			eventHandlers.get('lifecycle:changed')?.({
				type: 'lifecycle:changed',
				payload: { entityType: 'project', entityId: 'project-1' },
			})
			vi.advanceTimersByTime(80)
		})

		expectInvalidatedWorkspaceQueries()
	})

	it('收到 workspace restored 事件时也会刷新整个工作区', () => {
		expect.hasAssertions()
		renderUseWorkspaceSync({ type: 'all' })

		act(() => {
			eventHandlers.get('workspace:restored')?.({
				type: 'workspace:restored',
				payload: { source: 'sync_restore' },
			})
			vi.advanceTimersByTime(500)
		})

		expectInvalidatedWorkspaceQueries()
	})

	it('收到 Tauri workspace changed 事件时也会刷新整个工作区', () => {
		expect.hasAssertions()
		renderUseWorkspaceSync({ type: 'all' })

		act(() => {
			workspaceChangedHandlers[0]?.({
				source: 'sync',
				reason: 'pull',
			})
			vi.advanceTimersByTime(500)
		})

		expectInvalidatedWorkspaceQueries()
	})
})

function renderUseWorkspaceSync(scope: Scope = { type: 'space', spaceId: 'space-1' }) {
	return renderHook(() => useWorkspaceSync(scope), {
		wrapper: createQueryWrapper(),
	})
}

function createQueryWrapper() {
	const queryClient = new QueryClient()
	queryClient.invalidateQueries =
		invalidateQueriesSpy as unknown as typeof queryClient.invalidateQueries

	return function QueryWrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}
}

function expectInvalidatedWorkspaceQueries() {
	expect(invalidateQueriesSpy).toHaveBeenCalledTimes(6)
	expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] })
	expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['projects'] })
	expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['spaces'] })
	expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['lifecycle'] })
	expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['views'] })
	expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['activity'] })
}
