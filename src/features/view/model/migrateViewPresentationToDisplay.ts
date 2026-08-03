/**
 * 数据清洗：从 DB raw 行读出残留 sort/group → 写入 display-options default，
 * 再 updateView 清空列。产品 View 类型不含 sort/group；本模块自包含读 raw。
 */
import {
	createTaskDisplayViewPageKey,
	updateTaskDisplayPreference,
	type TaskDisplayOrderBy,
	type TaskDisplayPreferenceRecord,
} from '@/features/display-options'
import { normalizeFilterQuery } from '@/features/filter'
import type { FilterQuery } from '@/shared/types'
import { EMPTY_FILTER_QUERY } from '@/shared/types'

import { listCustomViewRawRecords, updateView } from '../api/views'

type LegacySortField =
	| 'position'
	| 'priority'
	| 'dueAt'
	| 'plannedAt'
	| 'createdAt'
	| 'updatedAt'
	| 'completedAt'

type LegacySortRule = {
	field: LegacySortField
	direction: 'asc' | 'desc'
}

type LegacyGroupBy = 'none' | 'status' | 'priority' | 'project' | 'due' | 'planned'

const ORDER_FIELD_MAP: Partial<Record<LegacySortField, TaskDisplayOrderBy>> = {
	priority: 'priority',
	dueAt: 'dueAt',
	plannedAt: 'plannedAt',
	createdAt: 'createdAt',
	updatedAt: 'updatedAt',
	completedAt: 'completedAt',
	position: 'manual',
}

export type MigrateViewPresentationResult = {
	migrated: number
	skipped: number
}

/**
 * 扫描自定义 View raw 行；有残留 sort/group 则迁入 display 并 update 清空。
 * 可重复执行：已空则 skip。
 */
export async function migrateViewPresentationToDisplay(): Promise<MigrateViewPresentationResult> {
	const rows = await listCustomViewRawRecords()
	let migrated = 0
	let skipped = 0

	for (const raw of rows) {
		const id = String(raw.id ?? '')
		if (!id) {
			skipped += 1
			continue
		}

		const sort = parseLegacySort(raw.sort)
		const groupBy = parseLegacyGroupBy(raw.groupBy)
		const hasSort = sort.length > 0
		const hasGroup = groupBy !== 'none'
		if (!hasSort && !hasGroup) {
			skipped += 1
			continue
		}

		const pageKey = createTaskDisplayViewPageKey(id)
		const preference: TaskDisplayPreferenceRecord = {}

		if (hasGroup) {
			if (
				groupBy === 'status' ||
				groupBy === 'priority' ||
				groupBy === 'project' ||
				groupBy === 'due' ||
				groupBy === 'planned'
			) {
				preference.groupBy = groupBy === 'planned' ? 'scheduled' : groupBy
			}
		}

		if (hasSort) {
			const first = sort[0]
			if (first) {
				const orderBy = ORDER_FIELD_MAP[first.field]
				if (orderBy) {
					preference.orderBy = orderBy
					preference.orderDirection = first.direction
				}
			}
		}

		if (Object.keys(preference).length > 0) {
			await updateTaskDisplayPreference({
				pageKey,
				workspaceDefault: preference,
			})
		}

		const filters = normalizeFilterQuery(
			(raw.filters as FilterQuery | null | undefined) ?? EMPTY_FILTER_QUERY,
		)
		// update 写回会清空后端 sort/group 列
		await updateView({
			viewId: id,
			filters,
		})
		migrated += 1
	}

	return { migrated, skipped }
}

function parseLegacySort(value: unknown): LegacySortRule[] {
	if (!Array.isArray(value)) {
		return []
	}
	const rules: LegacySortRule[] = []
	for (const item of value) {
		if (!item || typeof item !== 'object') continue
		const record = item as { field?: unknown; direction?: unknown }
		const field = record.field
		const direction = record.direction
		if (
			typeof field === 'string' &&
			isLegacySortField(field) &&
			(direction === 'asc' || direction === 'desc')
		) {
			rules.push({ field, direction })
		}
	}
	return rules
}

function parseLegacyGroupBy(value: unknown): LegacyGroupBy {
	if (
		value === 'status' ||
		value === 'priority' ||
		value === 'project' ||
		value === 'due' ||
		value === 'planned'
	) {
		return value
	}
	return 'none'
}

function isLegacySortField(value: string): value is LegacySortField {
	return (
		value === 'position' ||
		value === 'priority' ||
		value === 'dueAt' ||
		value === 'plannedAt' ||
		value === 'createdAt' ||
		value === 'updatedAt' ||
		value === 'completedAt'
	)
}
