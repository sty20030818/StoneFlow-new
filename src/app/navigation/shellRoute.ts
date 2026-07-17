/**
 * 路由语义入口（薄 re-export）。
 * 实现拆分：shellRouteTypes · shellRouteParse · shellRouteGuards。
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

export {
	isProjectShellPath,
	isShellPath,
	parseShellScopePath,
} from '@/app/navigation/shellRouteGuards'
