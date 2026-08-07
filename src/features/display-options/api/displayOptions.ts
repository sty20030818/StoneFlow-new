import {
	normalizeTaskDisplayPreference,
	type TaskDisplayPageKey,
	type TaskDisplayPreferenceRecord,
} from '@/features/display-options/core'
import {
	readLocalStorageValue,
	removeLocalStorageValue,
	writeLocalStorageValue,
} from '@/shared/lib/localStorageValue'

const DISPLAY_OPTIONS_KEY_PREFIX = 'stoneflow.display-options.'

export type TaskDisplayPreferencePayload = {
	personal: TaskDisplayPreferenceRecord | null
	workspaceDefault: TaskDisplayPreferenceRecord | null
}

type TaskDisplayPreferenceStoreRecord = {
	personal?: TaskDisplayPreferenceRecord
	workspaceDefault?: TaskDisplayPreferenceRecord
}

export type UpdateTaskDisplayPreferenceInput = {
	pageKey: TaskDisplayPageKey
	personal?: TaskDisplayPreferenceRecord | null
	workspaceDefault?: TaskDisplayPreferenceRecord | null
}

/**
 * 读取单个页面的 display preference。
 * personal 与 workspace default 都由 renderer localStorage 持久化。
 */
export async function getTaskDisplayPreference(
	pageKey: TaskDisplayPageKey,
): Promise<TaskDisplayPreferencePayload> {
	const stored = readLocalStorageValue<TaskDisplayPreferenceStoreRecord>(
		`${DISPLAY_OPTIONS_KEY_PREFIX}${buildTaskDisplayPreferenceStorageKey(pageKey)}`,
	)

	return {
		personal: stored?.personal ? normalizeTaskDisplayPreference(stored.personal) : null,
		workspaceDefault: stored?.workspaceDefault
			? normalizeTaskDisplayPreference(stored.workspaceDefault)
			: null,
	}
}

/**
 * 更新单个页面的 display preference。
 */
export async function updateTaskDisplayPreference({
	pageKey,
	personal,
	workspaceDefault,
}: UpdateTaskDisplayPreferenceInput): Promise<TaskDisplayPreferencePayload> {
	const nextValue: TaskDisplayPreferenceStoreRecord = {}

	if (personal) {
		nextValue.personal = normalizeTaskDisplayPreference(personal)
	}

	if (workspaceDefault) {
		nextValue.workspaceDefault = normalizeTaskDisplayPreference(workspaceDefault)
	}

	const storageKey = buildTaskDisplayPreferenceStorageKey(pageKey)
	const localStorageKey = `${DISPLAY_OPTIONS_KEY_PREFIX}${storageKey}`

	if (!nextValue.personal && !nextValue.workspaceDefault) {
		removeLocalStorageValue(localStorageKey)
		return {
			personal: null,
			workspaceDefault: null,
		}
	}

	writeLocalStorageValue(localStorageKey, nextValue)

	return {
		personal: nextValue.personal ?? null,
		workspaceDefault: nextValue.workspaceDefault ?? null,
	}
}

export function buildTaskDisplayPreferenceStorageKey(pageKey: TaskDisplayPageKey) {
	return `task:${pageKey}`
}
