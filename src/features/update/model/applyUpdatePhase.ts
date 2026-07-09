/**
 * 将统一 update-phase 事件应用到 store 动作（纯逻辑，便于单测）。
 */

import type { UpdateCheckMode } from '@/features/update/api/updates'

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
	showUpdate: (
		info: { version: string; body: string | null; pubDate: string | null },
		options?: { openDialog?: boolean },
	) => void
	setStatus: (status: {
		status: 'downloading' | 'error'
		downloaded?: number
		total?: number | null
		message?: string
	}) => void
	markReady: (version: string) => void
	ensureUpdateInfo: (version: string) => void
	shouldToastReady: (version: string) => boolean
	markReadyToasted: (version: string) => void
}

export type UpdatePhaseSideEffect =
	| { type: 'toast-ready'; version: string }
	| { type: 'toast-error'; message: string }
	| null

/**
 * 处理统一 phase 事件，返回可选副作用（toast）。
 */
export function applyUpdatePhaseEvent(
	event: UpdatePhaseEvent,
	actions: UpdatePhaseActions,
): UpdatePhaseSideEffect {
	switch (event.phase) {
		case 'available': {
			if (!event.version) return null
			const info = {
				version: event.version,
				body: event.body ?? null,
				pubDate: event.pubDate ?? null,
			}
			const openDialog = actions.checkMode !== 'autoDownload'
			actions.showUpdate(info, { openDialog })
			return null
		}
		case 'downloading': {
			if (actions.downloadUiAbandoned) return null
			if (event.version) {
				actions.ensureUpdateInfo(event.version)
			}
			actions.setStatus({
				status: 'downloading',
				downloaded: event.downloaded ?? 0,
				total: event.total ?? null,
			})
			return null
		}
		case 'ready': {
			if (!event.version) return null
			actions.markReady(event.version)
			if (actions.shouldToastReady(event.version)) {
				actions.markReadyToasted(event.version)
				return { type: 'toast-ready', version: event.version }
			}
			return null
		}
		case 'error': {
			const message = event.message ?? '更新失败'
			actions.setStatus({ status: 'error', message })
			return { type: 'toast-error', message }
		}
		default:
			return null
	}
}
