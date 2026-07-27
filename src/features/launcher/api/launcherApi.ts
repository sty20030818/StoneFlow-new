import { invoke } from '@tauri-apps/api/core'

import { searchEntities } from '@/features/global-search'
import { mapLauncherToTaskInput } from './mapLauncherToTaskInput'
import { mapSearchEntitiesToLauncher } from './mapSearchEntitiesToLauncher'
import type {
	LauncherPlacement,
	LauncherOpenContext,
	LauncherProjectsBySpace,
	LauncherRecentData,
	LauncherSearchResponse,
} from '../model/types'
import { createTask } from '@/features/task'

export type LauncherInput = {
	spaceId: string | null
	placement: LauncherPlacement
	title: string
	note: string | null
	status: string | null
	priority: number | null
	dueAt: string | null
	plannedAt: string | null
	remindAt: string | null
}

export type LauncherOpenTargetInput = {
	kind: 'task' | 'project'
	id: string
}

export type LauncherCloseReason = 'escape' | 'blur' | 'submit' | 'toggle' | 'invalidated'

export type LauncherOpenSessionResponse = {
	sessionId: string
	openedAt: string
} & LauncherOpenContext

export async function getRecentData() {
	return invoke<LauncherRecentData>('launcher_get_recent_data')
}

export async function presentSession(input: { sessionId: string }) {
	return invoke('launcher_present_session', { input })
}

export async function closeSession(input: { sessionId: string; reason: LauncherCloseReason }) {
	return invoke('launcher_close_session', { input })
}

export async function notifyFrontendReady() {
	return invoke('launcher_frontend_ready')
}

export async function listProjectsBySpace(spaceId: string) {
	return invoke<LauncherProjectsBySpace>('launcher_list_projects_by_space', {
		input: { spaceId },
	})
}

/**
 * Launcher 搜索：与主窗同一 `search_entities` 端口。
 * limit 控制面板展示条数；查询池用 limitPerSection 保证 active/completed 都有候选。
 */
export async function search(query: string, limit = 20): Promise<LauncherSearchResponse> {
	const result = await searchEntities({
		query,
		limitPerSection: Math.max(limit, 8),
	})
	return mapSearchEntitiesToLauncher(result, limit)
}

/**
 * Launcher 创建：走主窗 `create_task`（与 TaskCreateContent 同源内核）。
 */
export async function create(input: LauncherInput) {
	return createTask(mapLauncherToTaskInput(input))
}

/**
 * 创建后打开：同源 create_task，再经窗 IPC 聚焦主窗并导航。
 */
export async function createAndOpen(input: LauncherInput) {
	const task = await create(input)
	await openTarget({ kind: 'task', id: task.id })
	return task
}

/**
 * 打开任务/项目：窗专属 IPC（聚焦主窗 + 导航）。
 * 路径解析与主窗 open 策略一致（后端 resolve + 主窗 intents）。
 */
export async function openTarget(input: LauncherOpenTargetInput) {
	return invoke('launcher_open_target', { input })
}
