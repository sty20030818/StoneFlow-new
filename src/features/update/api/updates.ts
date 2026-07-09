/**
 * 应用内更新相关的 Tauri IPC 调用封装。
 *
 * Rust 侧序列化约定：
 * - enum 变体：camelCase（如 `notifyOnly`, `autoDownload`）
 * - struct 字段：camelCase（如 `checkMode`, `skippedVersions`, `lastCheckedAt`）
 * - UpdateStatus 是 internally tagged enum（tag 字段为 `status`）
 * - UpdateEvent 是 adjacently tagged（tag = `event`, content = `data`）
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
}

/**
 * 更新状态（与 Rust domain 层 `UpdateStatus` 对应）。
 * 使用 internally tagged 表示，tag 字段为 `status`。
 */
export type UpdateStatus =
	| { status: 'idle' }
	| { status: 'checking' }
	| { status: 'updateAvailable'; version: string; body: string | null; pubDate: string | null }
	| { status: 'upToDate' }
	| { status: 'downloading'; downloaded: number; total: number | null }
	| { status: 'downloaded'; version: string }
	| { status: 'error'; message: string }

/**
 * 通过 IPC Channel 推送到前端的更新事件。
 */
export interface UpdateStatusChangedEvent {
	event: 'statusChanged'
	data: { status: UpdateStatus }
}

/** 后端 emit 的全局事件名 */
export const UPDATE_EVENTS = {
	/** 统一阶段事件（主路径） */
	PHASE: 'update-phase',
	/** 以下为过渡期兼容事件（仍双发） */
	AVAILABLE: 'update-available',
	DOWNLOAD_PROGRESS: 'update-download-progress',
	DOWNLOADED: 'update-downloaded',
	ERROR: 'update-error',
} as const

/** 统一 update-phase 事件 payload */
export interface UpdatePhasePayload {
	phase: 'available' | 'downloading' | 'ready' | 'error'
	version?: string | null
	body?: string | null
	pubDate?: string | null
	downloaded?: number | null
	total?: number | null
	message?: string | null
}

/** 全局事件 payload 类型 */
export interface UpdateAvailablePayload {
	version: string
	body: string | null
	pubDate: string | null
}

export interface UpdateDownloadProgressPayload {
	version: string
	downloaded: number
	total: number | null
}

export interface UpdateDownloadedPayload {
	version: string
}

export interface UpdateErrorPayload {
	message: string
}

/** 检查更新 */
export async function checkUpdate(manual: boolean): Promise<UpdateInfo | null> {
	return invoke<UpdateInfo | null>('check_update', { manual })
}

/** 下载并安装更新，通过 onStatus 接收进度状态 */
export async function downloadAndInstall(onStatus: (status: UpdateStatus) => void): Promise<void> {
	const channel = new Channel<UpdateStatusChangedEvent>()
	channel.onmessage = (event) => {
		if (event.event === 'statusChanged') {
			onStatus(event.data.status)
		}
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

/** 获取当前更新设置 */
export async function getUpdateSettings(): Promise<UpdateSettings> {
	return invoke<UpdateSettings>('get_update_settings')
}

/** 进程内更新会话阶段 */
export type UpdateSessionPhase = 'idle' | 'downloading' | 'ready'

/** 进程内更新会话快照（挂载 hydrate） */
export interface UpdateSessionSnapshot {
	phase: UpdateSessionPhase
	version: string | null
	downloaded: number
	total: number | null
	downloadInFlight: boolean
}

/** 读取后端更新会话快照 */
export async function getUpdateSession(): Promise<UpdateSessionSnapshot> {
	return invoke<UpdateSessionSnapshot>('get_update_session')
}

/**
 * 取消进行中的下载：abort 后端下载 task，断开 HTTP 流。
 * 仅在「下载中」有效；已预装完成（就绪）后无效。
 */
export async function cancelUpdateDownload(): Promise<void> {
	return invoke('cancel_update_download')
}
