/**
 * 命令 / 快捷键 → Filter 表面 UI（锚定 FilterMenu）。
 * ListFilterUi 订阅；无订阅时事件被忽略。
 */

export type FilterUiEvent = { type: 'open-menu' } | { type: 'clear-all' }

type Listener = (event: FilterUiEvent) => void

const listeners = new Set<Listener>()

export function emitFilterUiEvent(event: FilterUiEvent) {
	for (const listener of listeners) {
		listener(event)
	}
}

export function subscribeFilterUiEvent(listener: Listener): () => void {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}
