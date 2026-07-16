import type { ActivityEntityType } from '@/features/activity'

const ACTIVITY_ENTITY_TYPES = new Set<ActivityEntityType>([
	'task',
	'project',
	'space',
	'view',
	'setting',
])

const DEFAULT_ACTIVITY_LIMIT = 50
const MAX_ACTIVITY_LIMIT = 200

export type ActivityDebugSearch = {
	entityType: ActivityEntityType
	entityId: string
	limit: number
}

/**
 * Activity debug 页的 URL 契约真相位。
 * route file 和 route-private 组件都只依赖这一份规范化逻辑。
 */
export function normalizeActivityDebugSearch(search: Record<string, unknown>): ActivityDebugSearch {
	const entityType =
		typeof search.entityType === 'string' &&
		ACTIVITY_ENTITY_TYPES.has(search.entityType as ActivityEntityType)
			? (search.entityType as ActivityEntityType)
			: 'task'
	const entityId = typeof search.entityId === 'string' ? search.entityId.trim() : ''
	const parsedLimit =
		typeof search.limit === 'number'
			? search.limit
			: typeof search.limit === 'string'
				? Number(search.limit)
				: Number.NaN
	const limit =
		Number.isFinite(parsedLimit) && parsedLimit > 0
			? Math.min(Math.round(parsedLimit), MAX_ACTIVITY_LIMIT)
			: DEFAULT_ACTIVITY_LIMIT

	return {
		entityType,
		entityId,
		limit,
	}
}
