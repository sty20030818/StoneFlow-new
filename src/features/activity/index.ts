/**
 * @fileoverview **activity · 唯一对外公共面（`@/features/activity`）**
 *
 * 实体活动时间线查询与 debug 页。
 *
 * 外模块：`import { … } from '@/features/activity'`
 * 禁止：`@/features/activity/api|hooks|components/…`
 */

export type {
	ActivityEntityType,
	ActivityActorType,
	ActivitySourceType,
	GetEntityActivitiesRequest,
	ActivityTimelineChange,
	ActivityTimelineEntry,
} from './api/getEntityActivities'

export { getEntityActivities } from './api/getEntityActivities'

export { useEntityActivitiesQuery, activityKeys } from './hooks'

export type { ActivityDebugLoadState } from './components/ActivityDebugPage'
export { ActivityDebugPage } from './components/ActivityDebugPage'
