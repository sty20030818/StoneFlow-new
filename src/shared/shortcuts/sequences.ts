import type { ShortcutBinding, ShortcutPrefixState, ShortcutSingleKey } from '@/shared/shortcuts/types'

export const PREFIX_TIMEOUT_MS = 1000

export function normalizeShortcutKey(event: KeyboardEvent): ShortcutSingleKey | null {
	if (event.metaKey || event.ctrlKey || event.altKey) {
		return null
	}

	if (event.key.length !== 1) {
		return null
	}

	return event.key.toLowerCase()
}

export function isPrefixExpired(prefixState: ShortcutPrefixState, now: number) {
	return now - prefixState.startedAt > PREFIX_TIMEOUT_MS
}

export function findSingleKeyBinding(
	bindings: ShortcutBinding[],
	key: ShortcutSingleKey,
) {
	return bindings.find((binding) => binding.sequence.length === 1 && binding.sequence[0] === key) ?? null
}

export function findSequenceBinding(
	bindings: ShortcutBinding[],
	prefix: ShortcutSingleKey,
	key: ShortcutSingleKey,
) {
	return (
		bindings.find(
			(binding) =>
				binding.sequence.length === 2 &&
				binding.sequence[0] === prefix &&
				binding.sequence[1] === key,
		) ?? null
	)
}

export function isRegisteredPrefix(
	bindings: ShortcutBinding[],
	key: ShortcutSingleKey,
) {
	return bindings.some((binding) => binding.sequence.length === 2 && binding.sequence[0] === key)
}
