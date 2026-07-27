import { getTaskDisplayPageCapabilities } from './task-display-capabilities'
import { getTaskDisplaySystemDefaults } from './task-display-defaults'
import type { TaskDisplayPageKey } from './display-page-key'
import {
	taskDisplayOptionsSchema,
	TASK_DISPLAY_COMPLETED_ORDER_VALUES,
	TASK_DISPLAY_GROUP_BY_VALUES,
	TASK_DISPLAY_ORDER_BY_VALUES,
	TASK_DISPLAY_ORDER_DIRECTION_VALUES,
	TASK_DISPLAY_PROPERTY_KEY_VALUES,
	type ResolvedTaskDisplayOptions,
	type TaskDisplayCompletedOrder,
	type TaskDisplayGroupBy,
	type TaskDisplayOptions,
	type TaskDisplayOrderBy,
	type TaskDisplayOrderDirection,
	type TaskDisplayPreferenceRecord,
	type TaskDisplayPropertyKey,
} from './task-display-options'

export type ResolveTaskDisplayOptionsInput = {
	pageKey: TaskDisplayPageKey
	workspaceDefault?: TaskDisplayPreferenceRecord | null
	personalOverride?: TaskDisplayPreferenceRecord | null
}

const GROUP_BY_SET = new Set<string>(TASK_DISPLAY_GROUP_BY_VALUES)
const ORDER_BY_SET = new Set<string>(TASK_DISPLAY_ORDER_BY_VALUES)
const ORDER_DIRECTION_SET = new Set<string>(TASK_DISPLAY_ORDER_DIRECTION_VALUES)
const COMPLETED_ORDER_SET = new Set<string>(TASK_DISPLAY_COMPLETED_ORDER_VALUES)
const PROPERTY_KEY_SET = new Set<string>(TASK_DISPLAY_PROPERTY_KEY_VALUES)

export function resolveTaskDisplayOptions({
	pageKey,
	workspaceDefault,
	personalOverride,
}: ResolveTaskDisplayOptionsInput): ResolvedTaskDisplayOptions {
	const defaults = getTaskDisplaySystemDefaults(pageKey)
	const capabilities = getTaskDisplayPageCapabilities(pageKey)
	const merged = mergeTaskDisplayPreferences(
		defaults,
		normalizeTaskDisplayPreference(workspaceDefault),
		normalizeTaskDisplayPreference(personalOverride),
	)

	const groupBy: TaskDisplayGroupBy = normalizeChoice<TaskDisplayGroupBy>(
		merged.groupBy ?? defaults.groupBy,
		capabilities.allowedGroupBy,
		getFallbackValue(defaults.groupBy, capabilities.allowedGroupBy),
	)

	let subGroupBy: TaskDisplayGroupBy = normalizeChoice<TaskDisplayGroupBy>(
		merged.subGroupBy ?? defaults.subGroupBy,
		capabilities.allowedSubGroupBy,
		getFallbackValue(defaults.subGroupBy, capabilities.allowedSubGroupBy),
	)

	if (subGroupBy === groupBy) {
		subGroupBy = 'none'
	}

	const orderBy: TaskDisplayOrderBy = normalizeChoice<TaskDisplayOrderBy>(
		merged.orderBy ?? defaults.orderBy,
		capabilities.allowedOrderBy,
		getFallbackValue(defaults.orderBy, capabilities.allowedOrderBy),
	)

	const orderDirection: TaskDisplayOrderDirection = normalizeChoice<TaskDisplayOrderDirection>(
		merged.orderDirection ?? defaults.orderDirection,
		TASK_DISPLAY_ORDER_DIRECTION_VALUES,
		defaults.orderDirection,
	)

	const completedOrder: TaskDisplayCompletedOrder = normalizeChoice<TaskDisplayCompletedOrder>(
		merged.completedOrder ?? defaults.completedOrder,
		capabilities.allowedCompletedOrder,
		getFallbackValue(defaults.completedOrder, capabilities.allowedCompletedOrder),
	)

	const visiblePropertiesSource =
		merged.visibleProperties === undefined ? defaults.visibleProperties : merged.visibleProperties
	const visibleProperties = filterVisibleProperties(
		visiblePropertiesSource,
		capabilities.allowedVisibleProperties,
	)

	const resolved: TaskDisplayOptions = {
		groupBy,
		subGroupBy,
		orderBy,
		orderDirection,
		completedOrder,
		showEmptyGroups: capabilities.supportsShowEmptyGroups
			? (merged.showEmptyGroups ?? defaults.showEmptyGroups)
			: defaults.showEmptyGroups,
		visibleProperties,
	}

	const parsed = taskDisplayOptionsSchema.safeParse(resolved)
	return parsed.success ? parsed.data : defaults
}

export function mergeTaskDisplayPreferences(
	...records: Array<TaskDisplayPreferenceRecord | null | undefined>
): TaskDisplayPreferenceRecord {
	return records.reduce<TaskDisplayPreferenceRecord>((accumulator, record) => {
		if (!record) {
			return accumulator
		}

		return {
			...accumulator,
			...record,
			visibleProperties:
				record.visibleProperties === undefined
					? accumulator.visibleProperties
					: [...record.visibleProperties],
		}
	}, {})
}

export function normalizeTaskDisplayPreference(
	preference: TaskDisplayPreferenceRecord | null | undefined,
): TaskDisplayPreferenceRecord {
	if (!preference) {
		return {}
	}

	const normalized: TaskDisplayPreferenceRecord = {}

	if (isTaskDisplayGroupBy(preference.groupBy)) {
		normalized.groupBy = preference.groupBy
	}

	if (isTaskDisplayGroupBy(preference.subGroupBy)) {
		normalized.subGroupBy = preference.subGroupBy
	}

	if (isTaskDisplayOrderBy(preference.orderBy)) {
		normalized.orderBy = preference.orderBy
	}

	if (isTaskDisplayOrderDirection(preference.orderDirection)) {
		normalized.orderDirection = preference.orderDirection
	}

	if (isTaskDisplayCompletedOrder(preference.completedOrder)) {
		normalized.completedOrder = preference.completedOrder
	}

	if (typeof preference.showEmptyGroups === 'boolean') {
		normalized.showEmptyGroups = preference.showEmptyGroups
	}

	if (preference.visibleProperties !== undefined) {
		normalized.visibleProperties = filterVisibleProperties(
			preference.visibleProperties,
			TASK_DISPLAY_PROPERTY_KEY_VALUES,
		)
	}

	return normalized
}

function isTaskDisplayGroupBy(value: unknown): value is TaskDisplayGroupBy {
	return typeof value === 'string' && GROUP_BY_SET.has(value)
}

function isTaskDisplayOrderBy(value: unknown): value is TaskDisplayOrderBy {
	return typeof value === 'string' && ORDER_BY_SET.has(value)
}

function isTaskDisplayOrderDirection(value: unknown): value is TaskDisplayOrderDirection {
	return typeof value === 'string' && ORDER_DIRECTION_SET.has(value)
}

function isTaskDisplayCompletedOrder(value: unknown): value is TaskDisplayCompletedOrder {
	return typeof value === 'string' && COMPLETED_ORDER_SET.has(value)
}

function filterVisibleProperties(
	values: readonly TaskDisplayPropertyKey[],
	allowed: readonly TaskDisplayPropertyKey[],
): TaskDisplayPropertyKey[] {
	const allowedSet = new Set<string>(allowed)
	// 用 Set 记录已加入的值，避免循环内重复 array.includes 扫描
	const seen = new Set<TaskDisplayPropertyKey>()
	const result: TaskDisplayPropertyKey[] = []

	for (const value of values) {
		if (!PROPERTY_KEY_SET.has(value) || !allowedSet.has(value) || seen.has(value)) {
			continue
		}

		seen.add(value)
		result.push(value)
	}

	return result
}

function normalizeChoice<T extends string>(value: T, allowed: readonly T[], fallback: T): T {
	return allowed.includes(value) ? value : fallback
}

function getFallbackValue<T extends string>(preferred: T, allowed: readonly T[]): T {
	return allowed.includes(preferred) ? preferred : allowed[0]
}
