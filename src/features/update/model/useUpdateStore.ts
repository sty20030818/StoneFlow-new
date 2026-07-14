/**
 * 更新模块 UI 状态（Zustand）—— phase 单轨。
 *
 * 真相源：phase + updateInfo / progress / errorMessage。
 * 无 domain 风格 UpdateStatus 双写。
 */

import { create } from 'zustand'
import type { UpdateCheckMode, UpdateInfo } from '@/features/update/api/updates'

export type UpdateUiPhase =
	| 'idle'
	| 'checking'
	| 'upToDate'
	| 'available'
	| 'downloading'
	| 'ready'
	| 'error'

export interface UpdateProgress {
	downloaded: number
	total: number | null
}

interface UpdateState {
	phase: UpdateUiPhase
	updateInfo: UpdateInfo | null
	progress: UpdateProgress | null
	errorMessage: string | null
	checkMode: UpdateCheckMode | null
	dialogVisible: boolean
	dismissedVersion: string | null
	readyChipDismissedVersion: string | null
	readyToastVersion: string | null
	/** 用户已取消下载：忽略迟到 progress */
	downloadUiAbandoned: boolean

	setCheckMode: (mode: UpdateCheckMode | null) => void
	setChecking: () => void
	setUpToDate: () => void
	showAvailable: (info: UpdateInfo, options?: { openDialog?: boolean }) => void
	setDownloading: (progress: UpdateProgress, version?: string) => void
	setReady: (version: string) => void
	setError: (message: string) => void
	setIdle: () => void
	/** 本地放弃下载 UI（配合 cancel_update_download abort） */
	cancelDownloadUiLocal: () => void
	closeDialog: () => void
	skipAndClose: () => void
	dismissReadyChip: () => void
	openDialog: () => void
	hydrateFromSession: (input: {
		phase: 'idle' | 'available' | 'downloading' | 'ready'
		version: string | null
		body?: string | null
		pubDate?: string | null
		downloaded: number
		total: number | null
	}) => void
	reset: () => void
}

function versionFromState(s: UpdateState): string | null {
	return s.updateInfo?.version ?? null
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
	phase: 'idle',
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

	setChecking: () =>
		set({
			phase: 'checking',
			progress: null,
			errorMessage: null,
			downloadUiAbandoned: false,
		}),

	setUpToDate: () =>
		set({
			phase: 'upToDate',
			progress: null,
			errorMessage: null,
			dialogVisible: false,
		}),

	showAvailable: (info, options) => {
		const openDialog = options?.openDialog ?? true
		// 仅「后台静默 available、且用户已 dismiss」时忽略；
		// 手动检查会 openDialog=true，必须能重新弹出（含曾跳过的版本）。
		if (!openDialog && get().dismissedVersion === info.version) return
		set({
			phase: 'available',
			updateInfo: info,
			progress: null,
			errorMessage: null,
			dialogVisible: openDialog,
			downloadUiAbandoned: false,
			// 用户再次看到该版本 → 清掉内存 dismiss
			dismissedVersion: get().dismissedVersion === info.version ? null : get().dismissedVersion,
		})
	},

	setDownloading: (progress, version) => {
		if (get().downloadUiAbandoned) return
		const prev = get().updateInfo
		set({
			phase: 'downloading',
			progress,
			errorMessage: null,
			downloadUiAbandoned: false,
			updateInfo: version
				? {
						version,
						body: prev?.version === version ? prev.body : (prev?.body ?? null),
						pubDate: prev?.version === version ? prev.pubDate : (prev?.pubDate ?? null),
					}
				: prev,
		})
	},

	setReady: (version) => {
		const prev = get().updateInfo
		set({
			phase: 'ready',
			progress: null,
			errorMessage: null,
			downloadUiAbandoned: false,
			// 下载完成 ≠ 自动安装：每次进入 ready 都重新展示底部悬浮栏
			//（自动下载 / 手动下载同理；用户点「稍后」才会再藏）
			readyChipDismissedVersion: null,
			updateInfo:
				prev?.version === version
					? prev
					: { version, body: prev?.body ?? null, pubDate: prev?.pubDate ?? null },
		})
	},

	setError: (message) =>
		set({
			phase: 'error',
			progress: null,
			errorMessage: message,
		}),

	setIdle: () =>
		set({
			phase: 'idle',
			progress: null,
			errorMessage: null,
			dialogVisible: false,
		}),

	cancelDownloadUiLocal: () => {
		const { updateInfo, phase } = get()
		if (phase !== 'downloading') return
		if (updateInfo) {
			set({
				downloadUiAbandoned: true,
				dialogVisible: false,
				phase: 'available',
				progress: null,
				errorMessage: null,
			})
			return
		}
		set({
			downloadUiAbandoned: true,
			dialogVisible: false,
			phase: 'idle',
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
			progress: null,
			errorMessage: null,
		})
	},

	dismissReadyChip: () => {
		const version = versionFromState(get())
		set({ readyChipDismissedVersion: version })
	},

	openDialog: () => {
		const { phase, updateInfo } = get()
		if (
			updateInfo ||
			phase === 'available' ||
			phase === 'ready' ||
			phase === 'downloading' ||
			phase === 'error'
		) {
			set({ dialogVisible: true })
		}
	},

	hydrateFromSession: (input) => {
		if (input.phase === 'idle') return
		const version = input.version
		const body = input.body ?? get().updateInfo?.body ?? null
		const pubDate = input.pubDate ?? get().updateInfo?.pubDate ?? null

		// 已发现更新：恢复 available（emit 可能在监听前丢失）
		if (input.phase === 'available') {
			if (!version) return
			const current = get()
			// 已在下载/就绪，或同一版本已展示，不覆盖、不强弹
			if (current.phase === 'downloading' || current.phase === 'ready') return
			if (current.phase === 'available' && current.updateInfo?.version === version) {
				return
			}
			// hydrate：若用户本会话已 dismiss 该版本，只恢复 footer、不强弹
			const dismissed = current.dismissedVersion === version
			const openDialog = !dismissed && current.checkMode !== 'autoDownload'
			set({
				phase: 'available',
				updateInfo: { version, body, pubDate },
				progress: null,
				errorMessage: null,
				downloadUiAbandoned: false,
				dialogVisible: openDialog,
			})
			return
		}

		if (input.phase === 'downloading') {
			set({
				phase: 'downloading',
				progress: { downloaded: input.downloaded, total: input.total },
				errorMessage: null,
				downloadUiAbandoned: false,
				dialogVisible: false,
				updateInfo: version ? { version, body, pubDate } : get().updateInfo,
			})
			return
		}

		// ready：会话恢复也视为「可安装」，展示悬浮栏（除非本会话已点「稍后」）
		if (!version) return
		const chipDismissed = get().readyChipDismissedVersion === version
		set({
			phase: 'ready',
			progress: null,
			errorMessage: null,
			downloadUiAbandoned: false,
			dialogVisible: false,
			updateInfo: { version, body, pubDate },
			// 首次恢复 ready 时确保 chip 可见；已点「稍后」则尊重
			readyChipDismissedVersion: chipDismissed ? version : null,
		})
	},

	reset: () =>
		set({
			phase: 'idle',
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

export function selectReadyChipVisible(state: UpdateState): boolean {
	if (state.phase !== 'ready') return false
	const version = state.updateInfo?.version
	if (!version) return false
	return state.readyChipDismissedVersion !== version
}

export function selectFooterUpdateVisible(state: UpdateState): boolean {
	return (
		state.phase === 'available' ||
		state.phase === 'downloading' ||
		state.phase === 'ready' ||
		state.phase === 'error'
	)
}
