import { useCallback, useEffect, useRef } from 'react'

import type { CommandId } from '@/features/command/core'
import {
	KEYBINDING_CHORD_TIMEOUT_MS,
	matchKeybindingEvent,
	type Keybinding,
	type KeybindingChordState,
	type KeybindingScope,
	type NormalizedKeyEvent,
	type ShortcutPlatform,
} from '@/features/command/keybinding'
import { setGlobalChordPending } from '@/shared/lib/global-chord-guard'
import { useLatestRef } from '@/shared/lib/useLatestRef'

import { buildChordSession, type CommandChordSession } from './chord-session'
import { SHORTCUT_DISPATCH_PRIORITY } from './shortcut-dispatcher'
import { useShortcutDispatcher } from './shortcut-dispatcher-context'

type UseCommandShortcutsOptions = {
	bindings: readonly Keybinding[]
	onTrigger: (id: CommandId) => void
	shouldTrigger?: (id: CommandId) => boolean
	onChordStateChange?: (session: CommandChordSession | null) => void
	scope?: KeybindingScope
	platform?: ShortcutPlatform
}

export function useCommandShortcuts({
	bindings,
	onTrigger,
	shouldTrigger,
	onChordStateChange,
	scope = 'global',
	platform,
}: UseCommandShortcutsOptions) {
	const onTriggerRef = useLatestRef(onTrigger)
	const shouldTriggerRef = useLatestRef(shouldTrigger)
	const onChordStateChangeRef = useLatestRef(onChordStateChange)
	const chordStateRef = useRef<KeybindingChordState | null>(null)
	const timeoutRef = useRef<number | null>(null)

	const emitChordState = useCallback(
		(chordState: KeybindingChordState | null) => {
			onChordStateChangeRef.current?.(
				chordState ? buildChordSession(bindings, chordState, platform) : null,
			)
		},
		[bindings, onChordStateChangeRef, platform],
	)

	const clearChordState = useCallback(() => {
		const hadPendingChord = chordStateRef.current !== null
		chordStateRef.current = null
		emitChordState(null)

		if (timeoutRef.current !== null) {
			window.clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}

		if (hadPendingChord) {
			// 保持到本次 keydown 分发结束；外部键盘监听也不会误消费 chord 第二键。
			window.setTimeout(() => setGlobalChordPending(false), 0)
		} else {
			setGlobalChordPending(false)
		}
	}, [emitChordState])

	const armChordTimeout = useCallback(() => {
		if (timeoutRef.current !== null) {
			window.clearTimeout(timeoutRef.current)
		}

		timeoutRef.current = window.setTimeout(() => {
			chordStateRef.current = null
			emitChordState(null)
			setGlobalChordPending(false)
			timeoutRef.current = null
		}, KEYBINDING_CHORD_TIMEOUT_MS)
	}, [emitChordState])

	useShortcutDispatcher(SHORTCUT_DISPATCH_PRIORITY.global, (event) => {
		const result = matchKeybindingEvent({
			bindings,
			event: normalizeKeyboardEvent(event),
			scope,
			chordState: chordStateRef.current,
			now: performance.now(),
			platform,
		})

		if (result.status === 'matched') {
			if (shouldTriggerRef.current && !shouldTriggerRef.current(result.keybinding.commandId)) {
				clearChordState()
				return 'unhandled'
			}

			if (result.keybinding.preventDefault) {
				event.preventDefault()
			}
			clearChordState()
			window.setTimeout(() => onTriggerRef.current(result.keybinding.commandId), 0)
			return 'handled'
		}

		if (result.status === 'pending') {
			chordStateRef.current = {
				prefix: result.prefix,
				scope: result.scope,
				startedAt: performance.now(),
			}
			emitChordState(chordStateRef.current)
			setGlobalChordPending(true)
			armChordTimeout()
			return 'handled'
		}

		clearChordState()
		return 'unhandled'
	})

	useEffect(
		() => () => {
			chordStateRef.current = null
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
			setGlobalChordPending(false)
		},
		[],
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
