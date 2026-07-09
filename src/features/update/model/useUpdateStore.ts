/**
 * 更新模块 UI 状态管理（Zustand）。
 *
 * phase 为系统态真相源（footer / chip）；status 兼容既有 Dialog。
 * 不直接调用 Tauri invoke，由 hooks 层触发 API 后写入。
 */

import { create } from 'zustand'
import type {
	UpdateCheckMode,
	UpdateInfo,
	UpdateStatus,
} from '@/features/update/api/updates'

/** Shell 级更新阶段（设计方案 UpdateUiPhase） */
export type UpdateUiPhase =
	| 'idle'
	| 'checking'
	| 'available'
	| 'downloading'
	| 'ready'
	| 'error'

interface UpdateState {
	phase: UpdateUiPhase
	/** 兼容 Dialog 的细粒度状态 */
	status: UpdateStatus
	updateInfo: UpdateInfo | null
	progress: { downloaded: number; total: number | null } | null
	errorMessage: string | null
	/** 当前检查模式（事件分流用） */
	checkMode: UpdateCheckMode | null
	dialogVisible: boolean
	/** 会话内跳过的版本（不再弹「发现更新」） */
	dismissedVersion: string | null
	/** 会话内对就绪 Chip 点了「稍后」的版本 */
	readyChipDismissedVersion: string | null
	/** 已 toast 过的就绪版本（防重复） */
	readyToastVersion: string | null
	/**
	 * 用户取消了下载 UI（best-effort）：忽略后续 progress，
	 * 真正下完仍会进入 ready。
	 */
	downloadUiAbandoned: boolean

	setCheckMode: (mode: UpdateCheckMode | null) => void
	/** 发现更新；openDialog 默认 true（仅提醒/手动） */
	showUpdate: (info: UpdateInfo, options?: { openDialog?: boolean }) => void
	setStatus: (status: UpdateStatus) => void
	markReady: (version: string) => void
	/** 放弃下载 UI（不保证中断底层下载） */
	abandonDownloadUi: () => void
	closeDialog: () => void
	skipAndClose: () => void
	dismissReadyChip: () => void
	openDialog: () => void
	reset: () => void
}

const initialStatus: UpdateStatus = { status: 'idle' }

function phaseFromStatus(status: UpdateStatus): UpdateUiPhase {
	switch (status.status) {
		case 'idle':
		case 'upToDate':
			return 'idle'
		case 'checking':
			return 'checking'
		case 'updateAvailable':
			return 'available'
		case 'downloading':
			return 'downloading'
		case 'downloaded':
			return 'ready'
		case 'error':
			return 'error'
	}
}

function progressFromStatus(
	status: UpdateStatus,
): { downloaded: number; total: number | null } | null {
	if (status.status === 'downloading') {
		return { downloaded: status.downloaded, total: status.total }
	}
	return null
}

function errorFromStatus(status: UpdateStatus): string | null {
	return status.status === 'error' ? status.message : null
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
	phase: 'idle',
	status: initialStatus,
	updateInfo: null,
	progress: null,
	errorMessage: null,
	checkMode: null,
	dialogVisible: false,
	dismissedVersion: null,
	readyChipDismissedVersion: null,
	readyToastVersion: null,
	downloadUiAbandoned: false,

	setCheckMode: (mode) => set({ checkMode: mode }),

	showUpdate: (info, options) => {
		if (get().dismissedVersion === info.version) {
			return
		}
		const openDialog = options?.openDialog ?? true
		set({
			dialogVisible: openDialog,
			updateInfo: info,
			status: { status: 'updateAvailable', ...info },
			phase: 'available',
			progress: null,
			errorMessage: null,
			downloadUiAbandoned: false,
		})
	},

	setStatus: (status) => {
		if (get().downloadUiAbandoned && status.status === 'downloading') {
			return
		}
		const patch: Partial<UpdateState> = {
			status,
			phase: phaseFromStatus(status),
			progress: progressFromStatus(status),
			errorMessage: errorFromStatus(status),
		}
		if (status.status === 'downloading') {
			patch.downloadUiAbandoned = false
		}
		if (status.status === 'updateAvailable') {
			patch.updateInfo = {
				version: status.version,
				body: status.body,
				pubDate: status.pubDate,
			}
		}
		if (status.status === 'downloaded') {
			const prev = get().updateInfo
			patch.updateInfo =
				prev?.version === status.version
					? prev
					: {
							version: status.version,
							body: prev?.body ?? null,
							pubDate: prev?.pubDate ?? null,
						}
			patch.downloadUiAbandoned = false
		}
		set(patch)
	},

	markReady: (version) => {
		const prev = get().updateInfo
		set({
			phase: 'ready',
			status: { status: 'downloaded', version },
			progress: null,
			errorMessage: null,
			downloadUiAbandoned: false,
			updateInfo:
				prev?.version === version
					? prev
					: { version, body: prev?.body ?? null, pubDate: prev?.pubDate ?? null },
		})
	},

	abandonDownloadUi: () => {
		const { updateInfo, phase } = get()
		if (phase !== 'downloading') return
		if (updateInfo) {
			set({
				downloadUiAbandoned: true,
				dialogVisible: false,
				phase: 'available',
				status: {
					status: 'updateAvailable',
					version: updateInfo.version,
					body: updateInfo.body,
					pubDate: updateInfo.pubDate,
				},
				progress: null,
				errorMessage: null,
			})
			return
		}
		set({
			downloadUiAbandoned: true,
			dialogVisible: false,
			phase: 'idle',
			status: initialStatus,
			progress: null,
			errorMessage: null,
		})
	},

	closeDialog: () => set({ dialogVisible: false }),

	skipAndClose: () => {
		const { updateInfo } = get()
		set({
			dialogVisible: false,
			dismissedVersion: updateInfo?.version ?? null,
			phase: 'idle',
			status: initialStatus,
			progress: null,
		})
	},

	dismissReadyChip: () => {
		const { status, updateInfo } = get()
		const version =
			status.status === 'downloaded' ? status.version : updateInfo?.version
		set({ readyChipDismissedVersion: version ?? null })
	},

	openDialog: () => {
		if (get().updateInfo || get().phase === 'available' || get().phase === 'ready') {
			set({ dialogVisible: true })
		}
	},

	reset: () =>
		set({
			phase: 'idle',
			status: initialStatus,
			updateInfo: null,
			progress: null,
			errorMessage: null,
			dialogVisible: false,
			dismissedVersion: null,
			readyChipDismissedVersion: null,
			readyToastVersion: null,
			downloadUiAbandoned: false,
		}),
}))

/** 是否应展示就绪 Chip */
export function selectReadyChipVisible(state: UpdateState): boolean {
	if (state.phase !== 'ready') return false
	const version =
		state.status.status === 'downloaded'
			? state.status.version
			: state.updateInfo?.version
	if (!version) return false
	return state.readyChipDismissedVersion !== version
}

/** footer 是否展示更新项 */
export function selectFooterUpdateVisible(state: UpdateState): boolean {
	return (
		state.phase === 'available' ||
		state.phase === 'downloading' ||
		state.phase === 'ready' ||
		state.phase === 'error'
	)
}
