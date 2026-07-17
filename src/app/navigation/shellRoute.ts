/**
 * 路由语义入口（薄 re-export）。
 * 实现：types · segments · build · parse · fromMatch · guards。
 */

export type {
	AppRoute,
	AppRouteKind,
	RouteScope,
	SettingsSectionKey,
	ShellRoute,
	ShellRouteLocationLike,
	ShellRouteMemory,
	ShellScopeKey,
	ShellSectionKey,
	ShellSectionSegment,
} from '@/app/navigation/shellRouteTypes'
export { buildShellScopeKey } from '@/app/navigation/shellRouteTypes'

export {
	parseAppRoute,
	parseShellRoute,
	resolveShellSection,
} from '@/app/navigation/shellRouteParse'

export { shellRouteFromMatch } from '@/app/navigation/shellRouteFromMatch'
export type {
	ShellRouteMatchInput,
	ShellRouteMatchParams,
} from '@/app/navigation/shellRouteFromMatch'

export {
	isProjectShellPath,
	isShellPath,
	parseShellScopePath,
} from '@/app/navigation/shellRouteGuards'
