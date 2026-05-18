import { shouldIgnoreKeybindingEvent } from './input-guard'
import type {
	Keybinding,
	KeybindingChordState,
	KeybindingMatchResult,
	KeybindingScope,
	KeybindingStroke,
	NormalizedKeyEvent,
} from './keybinding.types'

export const KEYBINDING_CHORD_TIMEOUT_MS = 1000

export function matchKeybindingEvent({
	bindings,
	event,
	scope = 'global',
	chordState,
	now,
}: {
	bindings: Keybinding[]
	event: NormalizedKeyEvent
	scope?: KeybindingScope
	chordState: KeybindingChordState | null
	now: number
}): KeybindingMatchResult {
	const stroke = normalizeKeybindingStroke(event)
	if (!stroke) {
		return { status: 'cancelled' }
	}

	const scopedBindings = bindings.filter((binding) => binding.scope === scope)
	const activeChord = chordState && !isChordExpired(chordState, now) ? chordState : null

	if (activeChord) {
		// 前缀态只消费合法第二键；非法键直接取消，避免把旧前缀带到下一次按键。
		const binding = scopedBindings.find(
			(candidate) =>
				candidate.sequence.length === 2 &&
				areStrokesEqual(candidate.sequence[0], activeChord.prefix) &&
				areStrokesEqual(candidate.sequence[1], stroke),
		)

		if (!binding) {
			return { status: 'cancelled' }
		}

		if (shouldIgnoreKeybindingEvent(event, binding.allowInEditable)) {
			return { status: 'ignored' }
		}

		return { status: 'matched', keybinding: binding }
	}

	const singleStrokeBinding = scopedBindings.find(
		(binding) => binding.sequence.length === 1 && areStrokesEqual(binding.sequence[0], stroke),
	)
	if (singleStrokeBinding) {
		if (shouldIgnoreKeybindingEvent(event, singleStrokeBinding.allowInEditable)) {
			return { status: 'ignored' }
		}

		return { status: 'matched', keybinding: singleStrokeBinding }
	}

	const hasSequencePrefix = scopedBindings.some(
		(binding) => binding.sequence.length === 2 && areStrokesEqual(binding.sequence[0], stroke),
	)
	if (!hasSequencePrefix) {
		return { status: 'cancelled' }
	}

	// 两段式 chord 的前缀本身不是命令，只进入等待态。
	if (shouldIgnoreKeybindingEvent(event)) {
		return { status: 'ignored' }
	}

	return { status: 'pending', prefix: stroke, scope }
}

export function isChordExpired(chordState: KeybindingChordState, now: number) {
	return now - chordState.startedAt > KEYBINDING_CHORD_TIMEOUT_MS
}

export function normalizeKeybindingStroke(event: NormalizedKeyEvent): KeybindingStroke | null {
	if (event.key.length !== 1 && event.key !== ' ' && !isSupportedNamedKey(event.key)) {
		return null
	}

	return {
		key: normalizeKeyName(event.key),
		meta: event.metaKey || undefined,
		ctrl: event.ctrlKey || undefined,
		alt: event.altKey || undefined,
		shift: event.shiftKey || undefined,
	}
}

function isSupportedNamedKey(key: string) {
	return key === 'Enter' || key === 'Delete' || key === 'Backspace' || key === 'Escape'
}

function normalizeKeyName(key: string) {
	if (key === ' ') {
		return 'Space'
	}
	if (isSupportedNamedKey(key)) {
		return key
	}
	return key.toLowerCase()
}

export function areStrokesEqual(left: KeybindingStroke, right: KeybindingStroke) {
	return (
		left.key === right.key &&
		Boolean(left.meta) === Boolean(right.meta) &&
		Boolean(left.ctrl) === Boolean(right.ctrl) &&
		Boolean(left.alt) === Boolean(right.alt) &&
		Boolean(left.shift) === Boolean(right.shift)
	)
}
