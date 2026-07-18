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

export function isBlockedByHigherLayer() {
	// 全局 chord 进行中时让位给全局命令系统，防止 chord 第二键（如 f→p 中的 p）
	// 被 Row 单键命令（如 taskSetPriority）同时消费。
	if (isGlobalChordPending()) {
		return true
	}

	return Boolean(
		document.querySelector(
			'[cmdk-root], [data-slot="dialog-content"], [data-slot="dropdown-menu-content"], [data-slot="context-menu-content"]',
		),
	)
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
	if (!(target instanceof HTMLElement)) {
		return false
	}

	return (
		target.tagName === 'INPUT' ||
		target.tagName === 'TEXTAREA' ||
		target.isContentEditable ||
		target.closest('[contenteditable="true"]') !== null
	)
}
