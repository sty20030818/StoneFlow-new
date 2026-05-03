import { useTaskChangedListener, useEventSubscription, type AppEvent } from '@/shared/events'
import { useLifecycleStore } from '@/features/lifecycle/model/useLifecycleStore'
import type { Scope } from '@/shared/types'
import { useProjectStore } from '@/features/project/model/useProjectStore'
import { useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import { useViewStore } from '@/features/view/model/useViewStore'

/**
 * 工作区数据同步 hook
 * 监听 Tauri IPC 事件和前端内部事件，刷新当前已加载的 Task / Project 切片。
 */
export function useWorkspaceSync(scope: Scope) {
	function refreshWorkspaceSlices() {
		void useTaskStore.getState().refreshLoadedSlices()
		void useSpaceStore.getState().load()
		void useLifecycleStore.getState().refreshLoadedSlices()
		void useViewStore.getState().refreshTaskRun()

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
		refreshWorkspaceSlices()
	})

	useEventSubscription('task:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:created', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('task:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:updated', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('task:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:deleted', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('project:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] project:created', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('project:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] project:updated', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('project:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] project:deleted', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('space:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] space:created', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('space:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] space:updated', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('space:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] space:deleted', event.payload)
		refreshWorkspaceSlices()
	})

	useEventSubscription('lifecycle:changed', (event: AppEvent) => {
		console.info('[useWorkspaceSync] lifecycle:changed', event.payload)
		refreshWorkspaceSlices()
	})
}
