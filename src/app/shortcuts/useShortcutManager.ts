import { useEffect, useRef } from 'react'

import {
	KEYBINDING_CHORD_TIMEOUT_MS,
	matchKeybindingEvent,
	type Keybinding,
	type KeybindingChordState,
	type NormalizedKeyEvent,
} from '@/features/command/keybinding'
import type { CommandId } from '@/features/command/core'

type UseShortcutManagerOptions = {
	bindings: Keybinding[]
	onTrigger: (id: CommandId) => void
}

export function useShortcutManager({ bindings, onTrigger }: UseShortcutManagerOptions) {
	const onTriggerRef = useRef(onTrigger)
	const chordStateRef = useRef<KeybindingChordState | null>(null)
	const timeoutRef = useRef<number | null>(null)

	onTriggerRef.current = onTrigger

	useEffect(() => {
		function scheduleTrigger(id: CommandId) {
			window.setTimeout(() => {
				onTriggerRef.current(id)
			}, 0)
		}

		function clearChordState() {
			chordStateRef.current = null
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
				timeoutRef.current = null
			}, KEYBINDING_CHORD_TIMEOUT_MS)
		}

		function handleKeyDown(event: KeyboardEvent) {
			const result = matchKeybindingEvent({
				bindings,
				event: normalizeKeyboardEvent(event),
				chordState: chordStateRef.current,
				now: performance.now(),
			})

			if (result.status === 'matched') {
				if (result.keybinding.preventDefault) {
					event.preventDefault()
				}
				clearChordState()
				scheduleTrigger(result.keybinding.commandId)
				return
			}

			if (result.status === 'pending') {
				event.preventDefault()
				chordStateRef.current = {
					prefix: result.prefix,
					scope: result.scope,
					startedAt: performance.now(),
				}
				armChordTimeout()
				return
			}

			if (result.status === 'ignored') {
				clearChordState()
				return
			}

			clearChordState()
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			clearChordState()
		}
	}, [bindings])
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
