/**
 * activity 域对外公共面（`@/features/activity`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/activity'`。
 * 禁止深路径进 api/hooks/components。
 * 实体活动时间线查询单源；task 详情 UI 只消费本域 query。
 */

// ── 类型 ────────────────────────────────────────────────────────────────────

export type {
	ActivityEntityType,
	ActivityTimelineChange,
	ActivityTimelineEntry,
} from './api/getEntityActivities'

// ── IO / Query ──────────────────────────────────────────────────────────────

/** 拉取实体活动时间线（debug 路由等）。 */
export { getEntityActivities } from './api/getEntityActivities'

/** 生产路径 Query（task 详情时间线等）。 */
export { useEntityActivitiesQuery } from './hooks'

// ── Debug UI ────────────────────────────────────────────────────────────────

export type { ActivityDebugLoadState } from './components/ActivityDebugPage'

/** `/debug/activity` 展示壳（路由装配数据）。 */
export { ActivityDebugPage } from './components/ActivityDebugPage'
