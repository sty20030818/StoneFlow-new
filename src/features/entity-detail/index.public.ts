/**
 * @fileoverview **entity-detail · 唯一对外公共面**
 *
 * 实体抽屉 / 独立详情 URL search 契约与控制器。
 *
 * 外模块：`import { … } from '@/features/entity-detail'`
 * 禁止：`@/features/entity-detail/model|components/…`
 */

export type {
	EntityDetailKind,
	EntityDetailNavigationTarget,
	EntityDetailOpenMode,
	EntityDetailParseResult,
	EntityDetailRouteState,
	EntityDetailTarget,
} from './model/entityDetailTypes'

export {
	buildEntityDetailSearch,
	clearEntityDetailSearch,
	normalizeEntityDetailId,
	parseEntityDetailRouteState,
} from './model/entityDetailRouteState'

export {
	closeEntityDrawerTarget,
	openEntityDrawerTarget,
	resolveEntityPageTarget,
} from './model/entityDetailNavigation'

/** 抽屉开关 / 独立页导航控制器。 */
export { useEntityDetailController } from './model/useEntityDetailController'

/** 壳层挂载的抽屉宿主（按 kind 分发 Task/Project drawer）。 */
export { EntityDetailDrawerHost } from './components/EntityDetailDrawerHost'
