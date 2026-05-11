import { useShortcutManager } from '@/app/shortcuts/useShortcutManager'
import { APP_SHORTCUT_BINDINGS } from '@/app/shortcuts/shortcutRegistry'
import type { ShortcutId } from '@/shared/shortcuts'

type ShortcutManagerProps = {
	onTrigger: (id: ShortcutId) => void
}

export function ShortcutManager({ onTrigger }: ShortcutManagerProps) {
	useShortcutManager({
		bindings: APP_SHORTCUT_BINDINGS,
		onTrigger,
	})

	return null
}
