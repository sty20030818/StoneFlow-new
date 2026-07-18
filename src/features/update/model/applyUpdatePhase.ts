/**
 * 将 update-phase 事件应用到 store 动作（纯逻辑，便于单测）。
 */

import type { UpdateCheckMode, UpdateInfo } from '../api/updates'
import type { UpdateProgress } from './useUpdateStore'

export type UpdatePhaseEvent = {
	phase: 'available' | 'downloading' | 'ready' | 'error'
	version?: string | null
	body?: string | null
	pubDate?: string | null
	downloaded?: number | null
	total?: number | null
	message?: string | null
}

export type UpdatePhaseActions = {
	checkMode: UpdateCheckMode | null
	downloadUiAbandoned: boolean
	showAvailable: (info: UpdateInfo, options?: { openDialog?: boolean }) => void
	setDownloading: (progress: UpdateProgress, version?: string) => void
	setReady: (version: string) => void
	setError: (message: string) => void
	shouldToastReady: (version: string) => boolean
	markReadyToasted: (version: string) => void
}

export type UpdatePhaseSideEffect =
	| { type: 'toast-ready'; version: string }
	| { type: 'toast-error'; message: string }
	| null

export function applyUpdatePhaseEvent(
	event: UpdatePhaseEvent,
	actions: UpdatePhaseActions,
): UpdatePhaseSideEffect {
	switch (event.phase) {
		case 'available': {
			if (!event.version) return null
			const info: UpdateInfo = {
				version: event.version,
				body: event.body ?? null,
				pubDate: event.pubDate ?? null,
			}
			const openDialog = actions.checkMode !== 'autoDownload'
			actions.showAvailable(info, { openDialog })
			return null
		}
		case 'downloading': {
			if (actions.downloadUiAbandoned) return null
			actions.setDownloading(
				{
					downloaded: event.downloaded ?? 0,
					total: event.total ?? null,
				},
				event.version ?? undefined,
			)
			return null
		}
		case 'ready': {
			if (!event.version) return null
			actions.setReady(event.version)
			if (actions.shouldToastReady(event.version)) {
				actions.markReadyToasted(event.version)
				return { type: 'toast-ready', version: event.version }
			}
			return null
		}
		case 'error': {
			const message = event.message ?? '更新失败'
			actions.setError(message)
			return { type: 'toast-error', message }
		}
		default:
			return null
	}
}
