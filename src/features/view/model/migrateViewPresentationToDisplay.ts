/**
 * T6：把 View 行上残留的 sort/group 一次性写入 display-options default，
 * 再 updateView 清空持久化（后端 update 本就会写空 sort/group）。
 */
import {
	createTaskDisplayViewPageKey,
	updateTaskDisplayPreference,
	type TaskDisplayOrderBy,
	type TaskDisplayPreferenceRecord,
} from '@/features/display-options'
import type { View, ViewSortField } from '@/shared/types'

import { updateView } from '../api/views'

const ORDER_FIELD_MAP: Partial<Record<ViewSortField, TaskDisplayOrderBy>> = {
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
 * 对自定义 View：若 sort 非空或 groupBy !== none，写入 display default 并 update 清空行内呈现字段。
 * 可重复执行：已空则 skip。
 */
export async function migrateViewPresentationToDisplay(
	views: readonly View[],
): Promise<MigrateViewPresentationResult> {
	let migrated = 0
	let skipped = 0

	for (const view of views) {
		if (view.kind !== 'custom') {
			skipped += 1
			continue
		}

		const hasSort = view.sort.length > 0
		const hasGroup = view.groupBy !== 'none'
		if (!hasSort && !hasGroup) {
			skipped += 1
			continue
		}

		const pageKey = createTaskDisplayViewPageKey(view.id)
		const preference: TaskDisplayPreferenceRecord = {}

		if (hasGroup && view.groupBy !== 'none') {
			// display groupBy 含 scheduled，与 TaskGroupBy 交集用 status/priority/project/due/planned
			if (
				view.groupBy === 'status' ||
				view.groupBy === 'priority' ||
				view.groupBy === 'project' ||
				view.groupBy === 'due' ||
				view.groupBy === 'planned'
			) {
				preference.groupBy = view.groupBy === 'planned' ? 'scheduled' : view.groupBy
			}
		}

		if (hasSort) {
			const first = view.sort[0]
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

		// 触发后端清空 sort/group 列，并确保 filters 以 clause 写回
		await updateView({
			viewId: view.id,
			filters: view.filters,
		})
		migrated += 1
	}

	return { migrated, skipped }
}
