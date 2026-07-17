import { invoke } from '@tauri-apps/api/core'

import { searchEntities } from '@/features/global-search'
import { mapQuickCreateToTaskInput } from '@/features/quick-create/api/mapQuickCreateToTaskInput'
import { mapSearchEntitiesToQuickCreate } from '@/features/quick-create/api/mapSearchEntitiesToQuickCreate'
import type {
	QuickCreateInitialState,
	QuickCreatePlacement,
	QuickCreateProjectsBySpace,
	QuickCreateSearchResponse,
} from '@/features/quick-create/model/types'
import { createTask } from '@/features/task'

export type QuickCreateInput = {
	spaceId: string | null
	placement: QuickCreatePlacement
	title: string
	note: string | null
	status: string | null
	priority: number | null
	dueAt: string | null
	scheduledAt: string | null
	reminderAt: string | null
}

export type QuickOpenTargetInput = {
	kind: 'task' | 'project'
	id: string
}

export type QuickCreateCloseReason = 'escape' | 'blur' | 'submit' | 'toggle' | 'invalidated'

export type QuickCreateOpenSessionResponse = {
	sessionId: string
	openedAt: string
	currentScope: QuickCreateInitialState['currentScope']
	defaultSpaceId: string
	defaultPlacement: QuickCreatePlacement
	spaces: QuickCreateInitialState['spaces']
	projects: QuickCreateInitialState['projects']
	recentTasks: QuickCreateInitialState['recentTasks']
	recentProjects: QuickCreateInitialState['recentProjects']
}

export async function getOpenContextSnapshot() {
	return invoke<QuickCreateInitialState>('quick_create_get_initial_state')
}

export async function commitLayout(input: {
	sessionId: string
	height: number
	devicePixelRatio: number
}) {
	return invoke('quick_create_commit_layout', {
		input,
	})
}

export type QuickCreateLayoutDiagnostics = {
	phase: string
	targetHeight: number
	viewportHeight: number
	devicePixelRatio: number
	visualViewportWidth: number
	visualViewportHeight: number
	visualViewportScale: number
	documentClientHeight: number
	documentScrollHeight: number
	bodyClientHeight: number
	bodyScrollHeight: number
	rootClientHeight: number
	rootScrollHeight: number
	surfaceOffsetHeight: number
	surfaceScrollHeight: number
	contentOffsetHeight: number
	contentScrollHeight: number
	footerOffsetHeight: number
	footerScrollHeight: number
}

export async function reportLayoutDiagnostics(input: QuickCreateLayoutDiagnostics) {
	return invoke('quick_create_report_layout_diagnostics', { input })
}

export async function presentSession(input: { sessionId: string }) {
	return invoke('quick_create_present_session', { input })
}

export async function closeSession(input: { sessionId: string; reason: QuickCreateCloseReason }) {
	return invoke('quick_create_close_session', { input })
}

export async function notifyFrontendReady() {
	return invoke('quick_create_frontend_ready')
}

export async function notifyFrontendUnready() {
	return invoke('quick_create_frontend_unready')
}

export async function listProjectsBySpace(spaceId: string) {
	return invoke<QuickCreateProjectsBySpace>('quick_create_list_projects_by_space', {
		input: { spaceId },
	})
}

/**
 * QC 搜索：与主窗同一 `search_entities` 端口。
 * limit 控制面板展示条数；查询池用 limitPerSection 保证 active/completed 都有候选。
 */
export async function search(query: string, limit = 3): Promise<QuickCreateSearchResponse> {
	const result = await searchEntities({
		query,
		limitPerSection: Math.max(limit, 8),
	})
	return mapSearchEntitiesToQuickCreate(result, limit)
}

/**
 * QC 创建：走主窗 `create_task`（与 TaskCreateContent 同源内核）。
 */
export async function create(input: QuickCreateInput) {
	return createTask(mapQuickCreateToTaskInput(input))
}

/**
 * 创建后打开：同源 create_task，再经窗 IPC 聚焦主窗并导航。
 */
export async function createAndOpen(input: QuickCreateInput) {
	const task = await createTask(mapQuickCreateToTaskInput(input))
	await openTarget({ kind: 'task', id: task.id })
	return task
}

/**
 * 打开任务/项目：窗专属 IPC（聚焦主窗 + 导航）。
 * 路径解析与主窗 open 策略一致（后端 resolve + 主窗 intents）。
 */
export async function openTarget(input: QuickOpenTargetInput) {
	return invoke('quick_create_open_target', { input })
}
