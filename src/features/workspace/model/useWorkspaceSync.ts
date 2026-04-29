import { useTaskChangedListener, useEventSubscription, type AppEvent } from '@/shared/events'

/**
 * 工作区数据同步 hook
 * 监听 Tauri IPC 事件和前端内部事件，触发数据刷新
 *
 * 当前为骨架实现，待数据层（API / store）接入后补充刷新逻辑
 */
export function useWorkspaceSync(spaceSlug: string) {
	// 监听 Tauri IPC: stoneflow://tasks/changed
	useTaskChangedListener(spaceSlug, (payload) => {
		console.info('[useWorkspaceSync] task changed via Tauri IPC', payload)
		// TODO: 刷新 inbox、focus、project 等数据
	})

	// 监听前端内部事件：task:created
	useEventSubscription('task:created', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:created', event.payload)
		// TODO: 刷新相关数据
	})

	// 监听前端内部事件：task:updated
	useEventSubscription('task:updated', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:updated', event.payload)
		// TODO: 刷新相关数据
	})

	// 监听前端内部事件：task:deleted
	useEventSubscription('task:deleted', (event: AppEvent) => {
		console.info('[useWorkspaceSync] task:deleted', event.payload)
		// TODO: 刷新相关数据
	})
}
