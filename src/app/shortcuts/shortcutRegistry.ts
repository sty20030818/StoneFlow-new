import type { ShortcutBinding } from '@/shared/shortcuts'

export const APP_SHORTCUT_BINDINGS: ShortcutBinding[] = [
	{ id: 'task-create.open', sequence: ['c'] },
	{ id: 'task-create.open-fullscreen', sequence: ['v'] },
	{ id: 'project-create.open', sequence: ['n', 'p'] },
	{ id: 'goto.inbox', sequence: ['g', 'i'] },
	{ id: 'goto.projects', sequence: ['g', 'p'] },
	{ id: 'goto.views', sequence: ['g', 'v'] },
]
