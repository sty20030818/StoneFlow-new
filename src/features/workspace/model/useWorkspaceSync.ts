import { debounce } from 'es-toolkit/function'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

import {
	useTaskChangedListener,
	useWorkspaceChangedListener,
	useEventSubscription,
	type AppEvent,
} from '@/shared/events'
import type { Scope } from '@/shared/types'
import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'

const DEBOUNCE_MS = 80
const LIFECYCLE_DEBOUNCE_MS = 500
const SYNC_WORKSPACE_DOMAINS = ['tasks', 'projects', 'spaces', 'lifecycle', 'views'] as const

/**
 * 工作区数据同步 hook
 * 监听 Tauri IPC 事件和前端内部事件，刷新当前已加载的 Task / Project 切片。
 * 使用 debounce 合并短时间内连续触发的多个事件（如 archive 同时发 project:updated + lifecycle:changed）。
 */
export function useWorkspaceSync(scope: Scope) {
	const queryClient = useQueryClient()
	const refreshLoadedData = useCallback(() => {
		void invalidateWorkspaceQueries(queryClient)
	}, [queryClient])

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

	useTaskChangedListener(scope, () => {
		scheduleRefresh()
	})

	useWorkspaceChangedListener((payload) => {
		if (payload.changedDomains) {
			if (payload.changedDomains.length === 0) {
				return
			}
			void invalidateWorkspaceQueries(queryClient, { include: payload.changedDomains })
			return
		}
		void invalidateWorkspaceQueries(queryClient, { include: [...SYNC_WORKSPACE_DOMAINS] })
	})

	useEventSubscription('task:created', () => {
		scheduleRefresh()
	})

	useEventSubscription('task:updated', () => {
		scheduleRefresh()
	})

	useEventSubscription('task:deleted', () => {
		scheduleRefresh()
	})

	useEventSubscription('project:created', () => {
		scheduleRefresh()
	})

	useEventSubscription('project:updated', () => {
		scheduleRefresh()
	})

	useEventSubscription('project:deleted', () => {
		scheduleRefresh()
	})

	useEventSubscription('space:created', () => {
		scheduleRefresh()
	})

	useEventSubscription('space:updated', () => {
		scheduleRefresh()
	})

	useEventSubscription('space:deleted', () => {
		scheduleRefresh()
	})

	useEventSubscription('workspace:restored', (event: AppEvent) => {
		if (event.type !== 'workspace:restored') {
			return
		}

		scheduleRefresh(LIFECYCLE_DEBOUNCE_MS)
	})

	useEventSubscription('lifecycle:changed', (event: AppEvent) => {
		if (event.type !== 'lifecycle:changed') {
			return
		}

		const isHeavyOperation =
			event.payload.operation === 'archive' ||
			event.payload.operation === 'restore' ||
			event.payload.operation === 'delete'
		scheduleRefresh(isHeavyOperation ? LIFECYCLE_DEBOUNCE_MS : DEBOUNCE_MS)
	})
}
