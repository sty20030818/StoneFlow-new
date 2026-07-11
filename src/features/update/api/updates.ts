/**
 * 应用内更新相关的 Tauri IPC 调用封装。
 *
 * 进度与状态统一为 phase 形状（与全局 update-phase 同构）。
 */

import { Channel, invoke } from '@tauri-apps/api/core'

/** 更新渠道 */
export type UpdateChannel = 'stable' | 'beta'

/** 更新检查模式 */
export type UpdateCheckMode = 'manual' | 'notifyOnly' | 'autoDownload'

/** 远端返回的更新信息 */
export interface UpdateInfo {
	version: string
	body: string | null
	pubDate: string | null
}

/** 更新设置 */
export interface UpdateSettings {
	checkMode: UpdateCheckMode
	channel: UpdateChannel
	skippedVersions: string[]
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

/** 后端 emit / Channel 的全局事件名 */
export const UPDATE_EVENTS = {
	PHASE: 'update-phase',
} as const

/** update-phase / IPC Channel 共用 payload */
export interface UpdatePhasePayload {
	phase: 'available' | 'downloading' | 'ready' | 'error'
	version?: string | null
	body?: string | null
	pubDate?: string | null
	downloaded?: number | null
	total?: number | null
	message?: string | null
}

/** 检查更新 */
export async function checkUpdate(manual: boolean): Promise<UpdateInfo | null> {
	return invoke<UpdateInfo | null>('check_update', { manual })
}

/** 下载并安装；onPhase 接收与全局 update-phase 同构的 payload */
export async function downloadAndInstall(
	onPhase: (payload: UpdatePhasePayload) => void,
): Promise<void> {
	const channel = new Channel<UpdatePhasePayload>()
	channel.onmessage = (payload) => {
		onPhase(payload)
	}
	return invoke('download_and_install', { onEvent: channel })
}

/** 重启并安装已下载的更新 */
export async function restartAndInstall(): Promise<void> {
	return invoke('restart_and_install')
}

/** 跳过指定版本 */
export async function skipVersion(version: string): Promise<void> {
	return invoke('skip_version', { version })
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

/** 进程内更新会话阶段 */
export type UpdateSessionPhase = 'idle' | 'available' | 'downloading' | 'ready'

/** 进程内更新会话快照（挂载 hydrate） */
export interface UpdateSessionSnapshot {
	phase: UpdateSessionPhase
	version: string | null
	body?: string | null
	pubDate?: string | null
	downloaded: number
	total: number | null
	downloadInFlight: boolean
}

/** 读取后端更新会话快照 */
export async function getUpdateSession(): Promise<UpdateSessionSnapshot> {
	return invoke<UpdateSessionSnapshot>('get_update_session')
}

/** 取消进行中的下载（abort 下载 task） */
export async function cancelUpdateDownload(): Promise<void> {
	return invoke('cancel_update_download')
}
