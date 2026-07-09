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
	/** @deprecated 使用 showAvailable */
	showUpdate: (info: UpdateInfo, options?: { openDialog?: boolean }) => void
	setDownloading: (progress: UpdateProgress, version?: string) => void
	setReady: (version: string) => void
	setError: (message: string) => void
	setIdle: () => void
	/** 本地放弃下载 UI（配合 cancel_update_download abort） */
	cancelDownloadUiLocal: () => void
	/** @deprecated 使用 cancelDownloadUiLocal */
	abandonDownloadUi: () => void
	closeDialog: () => void
	skipAndClose: () => void
	dismissReadyChip: () => void
	openDialog: () => void
	hydrateFromSession: (input: {
		phase: 'idle' | 'downloading' | 'ready'
		version: string | null
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
		if (get().dismissedVersion === info.version) return
		const openDialog = options?.openDialog ?? true
		set({
			phase: 'available',
			updateInfo: info,
			progress: null,
			errorMessage: null,
			dialogVisible: openDialog,
			downloadUiAbandoned: false,
		})
	},

	showUpdate: (info, options) => get().showAvailable(info, options),

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

	abandonDownloadUi: () => get().cancelDownloadUiLocal(),

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
		if (input.phase === 'downloading') {
			set({
				phase: 'downloading',
				progress: { downloaded: input.downloaded, total: input.total },
				errorMessage: null,
				downloadUiAbandoned: false,
				dialogVisible: false,
				updateInfo: version
					? {
							version,
							body: get().updateInfo?.body ?? null,
							pubDate: get().updateInfo?.pubDate ?? null,
						}
					: get().updateInfo,
			})
			return
		}
		if (!version) return
		set({
			phase: 'ready',
			progress: null,
			errorMessage: null,
			downloadUiAbandoned: false,
			dialogVisible: false,
			updateInfo: {
				version,
				body: get().updateInfo?.body ?? null,
				pubDate: get().updateInfo?.pubDate ?? null,
			},
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
