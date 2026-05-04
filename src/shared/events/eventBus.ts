import { useEffect } from 'react'
import { create } from 'zustand'

// ----- 事件类型定义 -----

export type AppEvent =
	| { type: 'task:created'; payload: { taskId: string } }
	| { type: 'task:updated'; payload: { taskId: string } }
	| { type: 'task:deleted'; payload: { taskId: string } }
	| { type: 'project:created'; payload: { projectId: string } }
	| { type: 'project:updated'; payload: { projectId: string } }
	| { type: 'project:deleted'; payload: { projectId: string } }
	| { type: 'space:created'; payload: { spaceId: string } }
	| { type: 'space:updated'; payload: { spaceId: string } }
	| { type: 'space:deleted'; payload: { spaceId: string } }
	| {
			type: 'lifecycle:changed'
			payload: {
				entityType: 'space' | 'project' | 'task'
				entityId: string
				operation?: 'archive' | 'restore' | 'delete'
			}
	  }

export type AppEventType = AppEvent['type']

// ----- 事件总线状态 -----

type Listener = (event: AppEvent) => void

type EventBusState = {
	listeners: Map<AppEventType, Set<Listener>>
	emit: (event: AppEvent) => void
	subscribe: (type: AppEventType, listener: Listener) => () => void
}

// ----- Store 实现 -----

export const useEventBus = create<EventBusState>((_set, get) => ({
	listeners: new Map(),

	emit: (event) => {
		const { listeners } = get()
		const typeListeners = listeners.get(event.type)
		if (!typeListeners) return

		for (const listener of typeListeners) {
			listener(event)
		}
	},

	subscribe: (type, listener) => {
		const { listeners } = get()

		if (!listeners.has(type)) {
			listeners.set(type, new Set())
		}

		const typeListeners = listeners.get(type)!
		typeListeners.add(listener)

		// 返回取消订阅函数
		return () => {
			typeListeners.delete(listener)
			if (typeListeners.size === 0) {
				listeners.delete(type)
			}
		}
	},
}))

// ----- 便捷函数 -----

/** 发送事件 */
export function emitEvent(event: AppEvent) {
	useEventBus.getState().emit(event)
}

// ----- React Hook -----

/**
 * 订阅指定类型的事件
 * @param type 事件类型
 * @param handler 事件处理函数
 */
export function useEventSubscription(type: AppEventType, handler: (event: AppEvent) => void) {
	const subscribe = useEventBus((state) => state.subscribe)

	useEffect(() => {
		return subscribe(type, handler)
	}, [subscribe, type, handler])
}
