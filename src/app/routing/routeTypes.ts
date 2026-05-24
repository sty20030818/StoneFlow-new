import type { Scope } from '@/shared/types'

export type RouteScope = Scope

export type ShellSectionSegment =
	| 'inbox'
	| 'all-tasks'
	| 'no-project'
	| 'views'
	| 'projects'
	| 'project'
	| 'archive'
	| 'trash'
	| 'settings'
	| 'debug/activity'
	| 'focus'

export type EntityShortcutTarget =
	| {
			kind: 'task'
			id: string
	  }
	| {
			kind: 'project'
			id: string
	  }

export type ShellPathKind =
	| 'canonical-all'
	| 'canonical-space'
	| 'legacy-all'
	| 'legacy-space'
	| 'task-shortcut'
	| 'project-shortcut'
	| 'other'
