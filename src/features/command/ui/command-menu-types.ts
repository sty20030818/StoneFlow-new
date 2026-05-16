export type CommandMenuMode =
	| 'default'
	| 'task-picker'
	| 'project-picker'
	| 'task-priority-picker'
	| 'task-status-picker'
	| 'task-date-picker'

export function isCommandMenuSearchMode(mode: CommandMenuMode) {
	return mode === 'task-picker' || mode === 'project-picker'
}

export function isCommandMenuTaskPropertyMode(mode: CommandMenuMode) {
	return (
		mode === 'task-priority-picker' ||
		mode === 'task-status-picker' ||
		mode === 'task-date-picker'
	)
}
