import { isGlobalChordPending } from '@/shared/lib/global-chord-guard'
import type { NormalizedKeyEvent } from '@/features/command'

import type { PointerPoint } from './types'

const POINTER_RECLAIM_THRESHOLD_PX = 12

/**
 * 键盘导航后抑制指针 hover，直到指针移动超过阈值再夺回。
 */
export function hasPointerMovedEnough(previous: PointerPoint | null, next: PointerPoint) {
	if (!previous) {
		return true
	}

	return (
		Math.abs(previous.x - next.x) >= POINTER_RECLAIM_THRESHOLD_PX ||
		Math.abs(previous.y - next.y) >= POINTER_RECLAIM_THRESHOLD_PX
	)
}

export function getCommandTargetId({
	rowTargetId,
	hoveredId,
	activeTaskId,
}: {
	rowTargetId: string | null
	hoveredId: string | null
	activeTaskId: string | null
}) {
	return rowTargetId ?? hoveredId ?? activeTaskId ?? null
}

export function toTaskRowRef(taskId: string | null | undefined) {
	return taskId ? { targetId: taskId } : null
}

/**
 * Overlay、编辑态与 IME 由键位匹配器读取同一个 KeyboardEvent 后决定是否忽略；
 * 这里仅保留跨 scope 的同步 chord 会话让位。
 */
export function isBlockedByHigherLayer() {
	return isGlobalChordPending()
}

export function normalizeKeyboardEvent(event: KeyboardEvent): NormalizedKeyEvent {
	return {
		key: event.key,
		metaKey: event.metaKey,
		ctrlKey: event.ctrlKey,
		altKey: event.altKey,
		shiftKey: event.shiftKey,
		defaultPrevented: event.defaultPrevented,
		isComposing: event.isComposing,
		target: event.target,
	}
}

export function isEditableEventTarget(target: EventTarget | null) {
	if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
		return false
	}

	return (
		target.tagName === 'INPUT' ||
		target.tagName === 'TEXTAREA' ||
		target.tagName === 'SELECT' ||
		target.isContentEditable ||
		target.closest('[contenteditable="true"]') !== null
	)
}
