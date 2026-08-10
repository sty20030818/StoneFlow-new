import { shouldIgnoreKeybindingEvent } from './input-guard'
import { inferShortcutPlatform } from './keybinding-format'
import type {
	Keybinding,
	KeybindingChordState,
	KeybindingMatchResult,
	KeybindingScope,
	KeybindingStroke,
	NormalizedKeyEvent,
	ShortcutPlatform,
} from './keybinding.types'

export const KEYBINDING_CHORD_TIMEOUT_MS = 1000

export function matchKeybindingEvent({
	bindings,
	event,
	scope = 'global',
	chordState,
	now,
	platform = inferShortcutPlatform(),
}: {
	bindings: readonly Keybinding[]
	event: NormalizedKeyEvent
	scope?: KeybindingScope
	chordState: KeybindingChordState | null
	now: number
	platform?: ShortcutPlatform
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
				areStrokesEqual(candidate.sequence[0], activeChord.prefix, platform) &&
				areStrokesEqual(candidate.sequence[1], stroke, platform),
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
		(binding) =>
			binding.sequence.length === 1 && areStrokesEqual(binding.sequence[0], stroke, platform),
	)
	if (singleStrokeBinding) {
		if (shouldIgnoreKeybindingEvent(event, singleStrokeBinding.allowInEditable)) {
			return { status: 'ignored' }
		}

		return { status: 'matched', keybinding: singleStrokeBinding }
	}

	const hasSequencePrefix = scopedBindings.some(
		(binding) =>
			binding.sequence.length === 2 && areStrokesEqual(binding.sequence[0], stroke, platform),
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
	return (
		key === 'Enter' ||
		key === 'Delete' ||
		key === 'Backspace' ||
		key === 'Escape' ||
		key === 'ArrowUp' ||
		key === 'ArrowDown'
	)
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

export function areStrokesEqual(
	left: KeybindingStroke,
	right: KeybindingStroke,
	platform: ShortcutPlatform = inferShortcutPlatform(),
) {
	const leftModifiers = resolveModifiers(left, platform)
	const rightModifiers = resolveModifiers(right, platform)
	return (
		normalizeComparableKey(left.key) === normalizeComparableKey(right.key) &&
		leftModifiers.meta === rightModifiers.meta &&
		leftModifiers.ctrl === rightModifiers.ctrl &&
		Boolean(left.alt) === Boolean(right.alt) &&
		Boolean(left.shift) === Boolean(right.shift)
	)
}

function normalizeComparableKey(key: string) {
	return key.length === 1 ? key.toLowerCase() : key
}

function resolveModifiers(stroke: KeybindingStroke, platform: ShortcutPlatform) {
	return {
		meta: Boolean(stroke.meta || (stroke.mod && platform === 'mac')),
		ctrl: Boolean(stroke.ctrl || (stroke.mod && platform !== 'mac')),
	}
}
