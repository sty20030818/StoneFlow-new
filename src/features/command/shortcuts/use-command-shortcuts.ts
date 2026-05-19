import { useEffect, useRef } from 'react'

import { isAnyModalOpen } from '@/shared/lib/modal-guard'
import type { CommandId } from '@/features/command/core'
import {
	KEYBINDING_CHORD_TIMEOUT_MS,
	matchKeybindingEvent,
	type KeybindingStroke,
	type KeybindingScope,
	type Keybinding,
	type KeybindingChordState,
	type NormalizedKeyEvent,
} from '@/features/command/keybinding'
import { buildChordSession, type CommandChordSession } from './chord-session'

type UseCommandShortcutsOptions = {
	bindings: Keybinding[]
	onTrigger: (id: CommandId) => void
	onChordStateChange?: (session: CommandChordSession | null) => void
	scope?: KeybindingScope
}

export function useCommandShortcuts({
	bindings,
	onTrigger,
	onChordStateChange,
	scope = 'global',
}: UseCommandShortcutsOptions) {
	const onTriggerRef = useRef(onTrigger)
	const onChordStateChangeRef = useRef(onChordStateChange)
	const chordStateRef = useRef<KeybindingChordState | null>(null)
	const timeoutRef = useRef<number | null>(null)

	onTriggerRef.current = onTrigger
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
