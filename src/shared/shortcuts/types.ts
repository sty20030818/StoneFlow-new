export type ShortcutId =
	| 'search.open'
	| 'command.open'
	| 'task-create.open'
	| 'task-create.open-fullscreen'
	| 'project-create.open'
	| 'goto.inbox'
	| 'goto.projects'
	| 'goto.views'

export type ShortcutSingleKey = string

export type ShortcutSequence = readonly [ShortcutSingleKey] | readonly [ShortcutSingleKey, ShortcutSingleKey]

export type ShortcutBinding = {
	id: ShortcutId
	sequence: ShortcutSequence
}

export type ShortcutPrefixState = {
	prefix: ShortcutSingleKey
	startedAt: number
}
