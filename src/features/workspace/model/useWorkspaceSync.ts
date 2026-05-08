import { debounce } from 'es-toolkit/function'
import { useCallback, useEffect, useMemo } from 'react'

import { useTaskChangedListener, useEventSubscription, type AppEvent } from '@/shared/events'
import { useLifecycleStore } from '@/features/lifecycle/model/useLifecycleStore'
import type { Scope } from '@/shared/types'
import { useProjectStore } from '@/features/project/model/useProjectStore'
import { useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import { useViewStore } from '@/features/view/model/useViewStore'

const DEBOUNCE_MS = 80
const LIFECYCLE_DEBOUNCE_MS = 500

/**
 * 工作区数据同步 hook
 * 监听 Tauri IPC 事件和前端内部事件，刷新当前已加载的 Task / Project 切片。
 * 使用 debounce 合并短时间内连续触发的多个事件（如 archive 同时发 project:updated + lifecycle:changed）。
 */
export function useWorkspaceSync(scope: Scope) {
	const refreshLoadedData = useCallback(() => {
		void useTaskStore.getState().refreshLoadedSlices()
		void useSpaceStore.getState().load()
		void useLifecycleStore.getState().refreshLoadedSlices()
		void useViewStore.getState().refreshTaskRun()

		const projectStore = useProjectStore.getState()
		if (projectStore.detail.projectId && !projectStore.detail.item?.archivedAt) {
			void projectStore.loadDetail(projectStore.detail.projectId)
		}
		if (projectStore.sidebar.scope) {
			void projectStore.loadSidebar(projectStore.sidebar.scope)
		}
		if (projectStore.overview.scope) {
			void projectStore.loadOverview(projectStore.overview.scope, projectStore.overview.viewKey)
		}
	}, [])

	const scheduleRefreshDebounced = useMemo(
		() => debounce(refreshLoadedData, DEBOUNCE_MS),
		[refreshLoadedData],
	)
	const scheduleHeavyRefreshDebounced = useMemo(
		() => debounce(refreshLoadedData, LIFECYCLE_DEBOUNCE_MS),
		[refreshLoadedData],
	)

	const scheduleRefresh = useCallback(
		(delayMs?: number) => {
			const useHeavyDebounce = delayMs === LIFECYCLE_DEBOUNCE_MS
			if (useHeavyDebounce) {
				scheduleRefreshDebounced.cancel()
				scheduleHeavyRefreshDebounced()
				return
			}

			scheduleHeavyRefreshDebounced.cancel()
			scheduleRefreshDebounced()
		},
		[scheduleHeavyRefreshDebounced, scheduleRefreshDebounced],
	)

	// cleanup on unmount
	useEffect(() => {
		return () => {
			scheduleRefreshDebounced.cancel()
			scheduleHeavyRefreshDebounced.cancel()
		}
	}, [scheduleHeavyRefreshDebounced, scheduleRefreshDebounced])

	useTaskChangedListener(scope, (payload) => {
		console.info('[useWorkspaceSync] task changed via Tauri IPC', payload)
		scheduleRefresh()
	})

	useEventSubscription('task:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:created', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('task:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:updated', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('task:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:deleted', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('project:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] project:created', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('project:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] project:updated', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('project:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] project:deleted', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('space:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] space:created', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('space:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] space:updated', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('space:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] space:deleted', event.payload)
		scheduleRefresh()
	})

	useEventSubscription('lifecycle:changed', (event: AppEvent) => {
		if (event.type !== 'lifecycle:changed') {
			return
		}

		console.info('[useWorkspaceSync] lifecycle:changed', event.payload)
		const isHeavyOperation =
			event.payload.operation === 'archive' ||
			event.payload.operation === 'restore' ||
			event.payload.operation === 'delete'
		scheduleRefresh(isHeavyOperation ? LIFECYCLE_DEBOUNCE_MS : DEBOUNCE_MS)
	})
}
