import type { SettingsSectionKey } from '@/features/settings/contract'
import type { Scope } from '@/shared/types'

/**
 * 路由语义类型：URL 解析结果与 route memory 共享结构。
 * 不含解析实现；解析见 shellRouteParse。
 */

export type RouteScope = Scope

export type { SettingsSectionKey }

export type ShellScopeKey = 'all' | `space:${string}`

export type ShellRouteMemory = {
	version: 3
	lastScopeKey: ShellScopeKey
	lastRouteByScopeKey: Record<string, string>
}

export type ShellSectionSegment =
	| 'inbox'
	| 'tasks'
	| 'views'
	| 'projects'
	| 'no-project'
	| 'archive'
	| 'trash'
	| 'settings'

export type ShellSectionKey =
	| 'inbox'
	| 'tasks'
	| 'views'
	| 'projects'
	| 'noProject'
	| 'archive'
	| 'trash'
	| 'settings'

export type AppRouteKind =
	| 'startup'
	| 'quick-create'
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
	/** 设置子分区；仅设置路径且 URL 含合法 `$section` 时有值 */
	settingsSection: SettingsSectionKey | null
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

export function buildShellScopeKey(scope: Scope): ShellScopeKey {
	return scope.type === 'all' ? 'all' : `space:${scope.spaceId}`
}
