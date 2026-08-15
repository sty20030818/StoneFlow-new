/**
 * @fileoverview **entity-detail · 唯一对外公共面（`@/features/entity-detail`）**
 *
 * 实体 Aside / 独立详情 URL search 契约与控制器。
 *
 * 外模块：`import { … } from '@/features/entity-detail'`
 * 禁止：`@/features/entity-detail/model|components/…`
 */

export type {
	EntityDetailKind,
	EntityDetailDrawerTarget,
	EntityDetailNavigationTarget,
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

/** Aside 开关 / 独立页导航控制器。 */
export { useEntityDetailController } from './model/useEntityDetailController'

/** 壳层挂载的任务详情 Aside 宿主。 */
export { EntityDetailDrawerHost } from './components/EntityDetailDrawerHost'
