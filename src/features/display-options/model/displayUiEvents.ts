/**
 * 快捷键 / 命令 → 显示选项表面 UI（锚定 Popover）。
 * DisplayOptionsButton 订阅；无订阅时事件被忽略。
 */

type DisplayUiEvent = { type: 'open-menu' }

type Listener = (event: DisplayUiEvent) => void

const listeners = new Set<Listener>()

export function emitDisplayUiEvent(event: DisplayUiEvent) {
	for (const listener of listeners) {
		listener(event)
	}
}

export function subscribeDisplayUiEvent(listener: Listener): () => void {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}
