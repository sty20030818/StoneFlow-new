const TASK_VIEW_PAGE_KEY_PREFIX = 'task:view:'

export type TaskDisplayScopedViewPageKey = `task:view:${string}`

export type TaskDisplayStaticPageKey =
	| 'task:all'
	| 'task:standalone'
	| 'task:project-detail'
	| 'task:today'
	| 'task:focus'
	| 'task:upcoming'
	| 'task:overdue'
	| 'task:completed'
	| 'task:canceled'
	| 'task:archived'

export type TaskDisplayPageKey = TaskDisplayStaticPageKey | TaskDisplayScopedViewPageKey

export type TaskDisplayPageKind = TaskDisplayStaticPageKey | 'task:view'

export const TASK_DISPLAY_STATIC_PAGE_KEYS = [
	'task:all',
	'task:standalone',
	'task:project-detail',
	'task:today',
	'task:focus',
	'task:upcoming',
	'task:overdue',
	'task:completed',
	'task:canceled',
	'task:archived',
] as const satisfies readonly TaskDisplayStaticPageKey[]

const TASK_DISPLAY_STATIC_PAGE_KEY_SET = new Set<string>(TASK_DISPLAY_STATIC_PAGE_KEYS)

export function createTaskDisplayViewPageKey(viewId: string): TaskDisplayScopedViewPageKey {
	return `${TASK_VIEW_PAGE_KEY_PREFIX}${viewId}`
}

export function isTaskDisplayPageKey(value: string): value is TaskDisplayPageKey {
	return (
		TASK_DISPLAY_STATIC_PAGE_KEY_SET.has(value) ||
		(value.startsWith(TASK_VIEW_PAGE_KEY_PREFIX) && value.length > TASK_VIEW_PAGE_KEY_PREFIX.length)
	)
}

export function isTaskDisplayViewPageKey(value: string): value is TaskDisplayScopedViewPageKey {
	return (
		value.startsWith(TASK_VIEW_PAGE_KEY_PREFIX) && value.length > TASK_VIEW_PAGE_KEY_PREFIX.length
	)
}

export function getTaskDisplayPageKind(pageKey: TaskDisplayPageKey): TaskDisplayPageKind {
	return isTaskDisplayViewPageKey(pageKey) ? 'task:view' : pageKey
}
