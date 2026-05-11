import { formatShortcutSequence, type ShortcutId } from '@/shared/shortcuts'
import { APP_SHORTCUT_BINDINGS } from '@/app/shortcuts/shortcutRegistry'

export function getShortcutDisplay(id: ShortcutId) {
	const binding = APP_SHORTCUT_BINDINGS.find((item) => item.id === id)
	return binding ? formatShortcutSequence(binding.sequence) : null
}
