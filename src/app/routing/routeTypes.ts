import type { Scope } from '@/shared/types'
import type { ShellSectionKey } from '@/app/layouts/shell/types'

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

export type ShellRoute = {
	scope: RouteScope | null
	spaceId: string | null
	section: ShellSectionKey
	projectId: string | null
	pathKind: ShellPathKind
	pathname: string
	search: string
	hash: string
	fullPath: string
	isShellPath: boolean
}

export type ShellRouteLocationLike =
	| string
	| {
			pathname: string
			search?: string
			hash?: string
	  }
