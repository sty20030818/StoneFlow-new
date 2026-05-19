import { useEffect, useRef } from 'react'

import { isAnyModalOpen } from '@/shared/lib/modal-guard'
import { setGlobalChordPending } from '@/shared/lib/global-chord-guard'
import type { CommandId } from '@/features/command/core'
import {
	KEYBINDING_CHORD_TIMEOUT_MS,
	matchKeybindingEvent,
	type KeybindingScope,
	type KeybindingStroke,
	type Keybinding,
	type KeybindingChordState,
	type NormalizedKeyEvent,
} from '@/features/command/keybinding'
import { buildChordSession, type CommandChordSession } from './chord-session'

type UseCommandShortcutsOptions = {
	bindings: Keybinding[]
	onTrigger: (id: CommandId) => void
	shouldTrigger?: (id: CommandId) => boolean
	onChordStateChange?: (session: CommandChordSession | null) => void
	scope?: KeybindingScope
}

export function useCommandShortcuts({
	bindings,
	onTrigger,
	shouldTrigger,
	onChordStateChange,
	scope = 'global',
}: UseCommandShortcutsOptions) {
	const onTriggerRef = useRef(onTrigger)
	const shouldTriggerRef = useRef(shouldTrigger)
	const onChordStateChangeRef = useRef(onChordStateChange)
	const chordStateRef = useRef<KeybindingChordState | null>(null)
	const timeoutRef = useRef<number | null>(null)

	onTriggerRef.current = onTrigger
	shouldTriggerRef.current = shouldTrigger
	onChordStateChangeRef.current = onChordStateChange

	useEffect(() => {
		function emitChordState(chordState: KeybindingChordState | null) {
			onChordStateChangeRef.current?.(chordState ? buildChordSession(bindings, chordState) : null)
		}

		function scheduleTrigger(id: CommandId) {
			window.setTimeout(() => {
				onTriggerRef.current(id)
			}, 0)
		}

		function clearChordState() {
			chordStateRef.current = null
			emitChordState(null)
			// 延迟到下一个宏任务再重置 Guard，确保本次 keydown 的其他 handler（如 TaskRowShortcutScope）
			// 在当前事件循环内仍能读到 pending=true，从而正确让位给全局 chord 命令。
			window.setTimeout(() => setGlobalChordPending(false), 0)
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}

		function armChordTimeout() {
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current)
			}

			timeoutRef.current = window.setTimeout(() => {
				chordStateRef.current = null
				emitChordState(null)
				setGlobalChordPending(false)
				timeoutRef.current = null
			}, KEYBINDING_CHORD_TIMEOUT_MS)
		}

		function handleKeyDown(event: KeyboardEvent) {
			// 模态层闸门：任意 AlertDialog 等模态层打开时，整体禁用全局命令快捷键，
			// 避免弹窗状态下 Enter / Cmd+Backspace 等键继续触发背景命令。
			// 弹窗内的键盘行为由 AlertDialogContent 的硬键盘合约接管（仅放行 Enter/Esc）。
			if (isAnyModalOpen()) {
				return
			}

			const result = matchKeybindingEvent({
				bindings,
				event: normalizeKeyboardEvent(event),
				scope,
				chordState: chordStateRef.current,
				now: performance.now(),
			})

			if (result.status === 'matched') {
				if (shouldTriggerRef.current && !shouldTriggerRef.current(result.keybinding.commandId)) {
					clearChordState()
					return
				}

				// 只对修饰键组合和特殊键调用 preventDefault，避免对普通字母键 preventDefault
				// 触发 macOS 的"输入时自动隐藏光标"行为。
				// 字母 chord（f→p、g→p 等）的 Row 双触发问题由 GlobalChordGuard（方案 C）独立解决，
				// 不再依赖 preventDefault 来隔离。
				if (shouldPreventDefaultForMatchedKeybinding(result.keybinding.sequence)) {
					event.preventDefault()
				}
				clearChordState()
				scheduleTrigger(result.keybinding.commandId)
				return
			}

			if (result.status === 'pending') {
				chordStateRef.current = {
					prefix: result.prefix,
					scope: result.scope,
					startedAt: performance.now(),
				}
				emitChordState(chordStateRef.current)
				// 方案 C：将 chord 状态写入全局 Guard，供 Row 等作用域在 isBlockedByHigherLayer 中读取。
				setGlobalChordPending(true)
				armChordTimeout()
				return
			}

			clearChordState()
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			clearChordState()
		}
	}, [bindings, scope])
}

// 只对"有修饰键"或"特殊功能键"的绑定 preventDefault，普通字母键不 prevent，
// 避免 macOS 把 preventDefault 解读为"用户在输入"而隐藏光标。
function shouldPreventDefaultForMatchedKeybinding(sequence: Keybinding['sequence']) {
	return sequence.some((stroke) => shouldPreventDefaultForStroke(stroke))
}

function shouldPreventDefaultForStroke(stroke: KeybindingStroke) {
	if (stroke.meta || stroke.ctrl || stroke.alt) {
		return true
	}

	return (
		stroke.key === 'Enter' ||
		stroke.key === 'Delete' ||
		stroke.key === 'Backspace' ||
		stroke.key === 'Escape' ||
		stroke.key === 'Space'
	)
}

function normalizeKeyboardEvent(event: KeyboardEvent): NormalizedKeyEvent {
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
