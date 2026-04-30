import { useTaskChangedListener, useEventSubscription, type AppEvent } from '@/shared/events'
import type { Scope } from '@/shared/types'
import { useProjectStore } from '@/features/project/model/useProjectStore'
import { useTaskStore } from '@/features/task/model/useTaskStore'

/**
 * 工作区数据同步 hook
 * 监听 Tauri IPC 事件和前端内部事件，刷新当前已加载的 Task / Project 切片。
 */
export function useWorkspaceSync(scope: Scope) {
	function refreshTaskBoundSlices() {
		void useTaskStore.getState().refreshLoadedSlices()

		const projectStore = useProjectStore.getState()
		if (projectStore.detail.projectId) {
			void projectStore.loadDetail(projectStore.detail.projectId)
		}
		if (projectStore.sidebar.scope) {
			void projectStore.loadSidebar(projectStore.sidebar.scope)
		}
		if (projectStore.overview.scope) {
			void projectStore.loadOverview(projectStore.overview.scope, projectStore.overview.viewKey)
		}
	}

	useTaskChangedListener(scope, (payload) => {
		console.info('[useWorkspaceSync] task changed via Tauri IPC', payload)
		refreshTaskBoundSlices()
	})

	useEventSubscription('task:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:created', event.payload)
		refreshTaskBoundSlices()
	})

	useEventSubscription('task:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:updated', event.payload)
		refreshTaskBoundSlices()
	})

	useEventSubscription('task:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:deleted', event.payload)
		refreshTaskBoundSlices()
	})
}
