import { LazyStore } from '@tauri-apps/plugin-store'

import {
	normalizeTaskDisplayPreference,
	type TaskDisplayPageKey,
	type TaskDisplayPreferenceRecord,
} from '@/features/display-options/core'

const DISPLAY_OPTIONS_STORE_PATH = 'display-options-preferences.json'

const displayOptionsStore = new LazyStore(DISPLAY_OPTIONS_STORE_PATH)

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
 * 第一阶段 personal 走本地 store，workspace default 只保留结构占位。
 */
export async function getTaskDisplayPreference(
	pageKey: TaskDisplayPageKey,
): Promise<TaskDisplayPreferencePayload> {
	const stored = await displayOptionsStore.get<TaskDisplayPreferenceStoreRecord>(
		buildTaskDisplayPreferenceStorageKey(pageKey),
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

	if (!nextValue.personal && !nextValue.workspaceDefault) {
		await displayOptionsStore.delete(storageKey)
		await displayOptionsStore.save()
		return {
			personal: null,
			workspaceDefault: null,
		}
	}

	await displayOptionsStore.set(storageKey, nextValue)
	await displayOptionsStore.save()

	return {
		personal: nextValue.personal ?? null,
		workspaceDefault: nextValue.workspaceDefault ?? null,
	}
}

export function buildTaskDisplayPreferenceStorageKey(pageKey: TaskDisplayPageKey) {
	return `task:${pageKey}`
}
