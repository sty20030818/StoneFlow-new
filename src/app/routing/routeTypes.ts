import type { Scope } from '@/shared/types'

export type RouteScope = Scope

export type ShellSectionSegment =
	| 'inbox'
	| 'tasks'
	| 'views'
	| 'projects'
	| 'no-project'
	| 'archive'
	| 'trash'

export type ShellSectionKey =
	| 'inbox'
	| 'tasks'
	| 'views'
	| 'projects'
	| 'noProject'
	| 'archive'
	| 'trash'

export type AppRouteKind =
	| 'startup'
	| 'quick-create'
	| 'settings'
	| 'debug-activity'
	| 'shell-section'
	| 'view'
	| 'task'
	| 'project'
	| 'unknown'

export type AppRoute =
	| {
			kind: 'startup'
			pathname: '/'
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'quick-create'
			pathname: '/quick-create'
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'settings'
			pathname: '/settings'
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'debug-activity'
			pathname: '/debug/activity'
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'shell-section'
			scope: RouteScope
			section: ShellSectionKey
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'view'
			scope: RouteScope
			viewId: string | null
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'task'
			spaceId: string
			taskId: string
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'project'
			spaceId: string
			projectId: string
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'unknown'
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }

export type ShellRoute = {
	appRoute: AppRoute
	kind: AppRouteKind
	scope: RouteScope | null
	spaceId: string | null
	section: ShellSectionKey
	viewId: string | null
	projectId: string | null
	taskId: string | null
	pathname: string
	search: string
	hash: string
	fullPath: string
	isShellPath: boolean
	isSettingsPath: boolean
	isDebugPath: boolean
	isQuickCreatePath: boolean
	isWorkPath: boolean
}

export type ShellRouteLocationLike =
	| string
	| {
			pathname: string
			search?: string
			hash?: string
	  }
