/**
 * 应用内更新相关的 Tauri IPC 调用封装。
 */

import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'

/** 更新渠道 */
export type UpdateChannel = 'stable' | 'beta'

/** 更新检查模式 */
export type UpdateCheckMode = 'manual' | 'notifyOnly' | 'autoDownload'

/** 已检查更新的不可变身份。 */
export interface UpdateIdentity {
	version: string
	channel: UpdateChannel
}

/** 更新设置 */
export interface UpdateSettings {
	checkMode: UpdateCheckMode
	channel: UpdateChannel
	/** 当前忽略的单一版本号；新版本号发布后仍会提醒 */
	skippedVersion: string | null
	lastCheckedAt: number | null
	/** 自动检查间隔（秒）：3600 / 10800 / 21600 / 43200 / 86400 */
	checkIntervalSecs: number
}

/** 允许的检查间隔（与 domain ALLOWED_CHECK_INTERVAL_SECS 对齐） */
export const ALLOWED_CHECK_INTERVAL_SECS = [
	60 * 60,
	3 * 60 * 60,
	6 * 60 * 60,
	12 * 60 * 60,
	24 * 60 * 60,
] as const

export type CheckIntervalSecs = (typeof ALLOWED_CHECK_INTERVAL_SECS)[number]

/** 更新生命周期唯一事件。 */
export const UPDATE_SESSION_CHANGED_EVENT = 'update-session-changed'

/** 读取当前运行包版本。 */
export function getCurrentVersion(): Promise<string> {
	return getVersion()
}

/** 消费一次应用内更新完成确认；未匹配或已消费时返回 null。 */
export async function consumeCompletedUpdate(): Promise<string | null> {
	return invoke<string | null>('consume_completed_update', {
		currentVersion: await getCurrentVersion(),
	})
}

/** 设置更新检查模式 */
export async function setCheckMode(mode: UpdateCheckMode): Promise<void> {
	return invoke('set_check_mode', { mode })
}

/** 设置更新渠道 */
export async function setChannel(channel: UpdateChannel): Promise<void> {
	return invoke('set_channel', { channel })
}

/** 设置自动检查间隔（秒） */
export async function setCheckIntervalSecs(intervalSecs: number): Promise<void> {
	return invoke('set_check_interval_secs', { intervalSecs })
}

/** 获取当前更新设置 */
export async function getUpdateSettings(): Promise<UpdateSettings> {
	return invoke<UpdateSettings>('get_update_settings')
}

/** 进程内更新会话生命周期状态。 */
export type UpdateSessionPhase = 'idle' | 'available' | 'downloading' | 'ready' | 'installing'

export interface UpdateProgress {
	downloaded: number
	total: number | null
}

/** 后端更新会话的唯一权威快照。 */
export interface UpdateSessionSnapshot {
	revision: number
	phase: UpdateSessionPhase
	update: UpdateIdentity | null
	progress: UpdateProgress | null
	errorMessage: string | null
}

export type UpdateLifecycleResult =
	| { status: 'ok'; snapshot: UpdateSessionSnapshot }
	| { status: 'conflict'; message: string; snapshot: UpdateSessionSnapshot }
	| { status: 'failed'; message: string; snapshot: UpdateSessionSnapshot }

export type ManualUpdateCheckResult =
	| { status: 'ok'; snapshot: UpdateSessionSnapshot; noUpdate: boolean }
	| { status: 'failed'; message: string; snapshot: UpdateSessionSnapshot }

/** 仅跳过当前精确的 Available 更新身份。 */
export async function skipVersion(
	expectedVersion: string,
	expectedChannel: UpdateChannel,
): Promise<UpdateLifecycleResult> {
	return invoke<UpdateLifecycleResult>('skip_version', { expectedVersion, expectedChannel })
}

/** 读取后端更新会话快照 */
export async function getUpdateSession(): Promise<UpdateSessionSnapshot> {
	return invoke<UpdateSessionSnapshot>('get_update_session')
}

/** 用户主动检查更新；checking / noUpdate 仅是本次交互结果，不是 lifecycle phase。 */
export async function checkUpdate(): Promise<ManualUpdateCheckResult> {
	return invoke<ManualUpdateCheckResult>('check_update')
}

/** 按已检查身份下载并暂存更新。 */
export async function downloadUpdate(
	expectedVersion: string,
	expectedChannel: UpdateChannel,
): Promise<UpdateLifecycleResult> {
	return invoke<UpdateLifecycleResult>('download_update', { expectedVersion, expectedChannel })
}

/** 安装精确的 staged update；跨渠道时必须显式确认其来源渠道。 */
export async function installStagedUpdate(
	expectedVersion: string,
	confirmedSourceChannel: UpdateChannel | null,
): Promise<UpdateLifecycleResult> {
	return invoke<UpdateLifecycleResult>('install_staged_update', {
		expectedVersion,
		confirmedSourceChannel,
	})
}

/** 取消进行中的下载并返回取消后的权威快照。 */
export async function cancelUpdateDownload(): Promise<UpdateSessionSnapshot> {
	return invoke<UpdateSessionSnapshot>('cancel_update_download')
}
