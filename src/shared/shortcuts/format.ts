import type { ShortcutSequence } from '@/shared/shortcuts/types'

export function formatShortcutSequence(sequence: ShortcutSequence) {
	return sequence.map((key) => key.toUpperCase()).join(' ')
}
