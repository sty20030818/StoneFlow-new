import { useShortcutManager } from '@/app/shortcuts/useShortcutManager'
import { APP_SHORTCUT_BINDINGS } from '@/app/shortcuts/shortcutRegistry'
import type { CommandId } from '@/features/command/core'

type ShortcutManagerProps = {
	onTrigger: (id: CommandId) => void
}

export function ShortcutManager({ onTrigger }: ShortcutManagerProps) {
	useShortcutManager({
		bindings: APP_SHORTCUT_BINDINGS,
		onTrigger,
	})

	return null
}
