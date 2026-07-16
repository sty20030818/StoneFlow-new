export type CommandMenuMode =
	| 'default'
	| 'task-picker'
	| 'project-picker'
	| 'task-placement-picker'
	| 'task-priority-picker'
	| 'task-status-picker'
	| 'task-date-picker'
	| 'filter-picker'

export function isCommandMenuSearchMode(mode: CommandMenuMode) {
	return (
		mode === 'task-picker' ||
		mode === 'project-picker' ||
		mode === 'task-placement-picker' ||
		mode === 'filter-picker'
	)
}

export function isCommandMenuTaskPropertyMode(mode: CommandMenuMode) {
	return (
		mode === 'task-priority-picker' || mode === 'task-status-picker' || mode === 'task-date-picker'
	)
}
