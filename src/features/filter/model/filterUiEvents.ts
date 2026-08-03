/**
 * 命令 / 快捷键 → Filter 表面 UI（不经 Command 全页 picker）。
 * ListFilterUi 订阅；无订阅时事件被忽略。
 */

import type { FilterField } from '../core'

export type FilterUiEvent =
	| { type: 'open-menu'; field?: FilterField | null }
	| { type: 'clear-all' }

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

/** PageFilterKind → FilterField（root 无预选字段） */
export function pageFilterKindToField(
	kind: 'root' | 'priority' | 'status' | 'date' | 'project' | string,
): FilterField | null {
	switch (kind) {
		case 'priority':
			return 'priority'
		case 'status':
			return 'status'
		case 'date':
			return 'due'
		case 'project':
			return 'project'
		default:
			return null
	}
}
