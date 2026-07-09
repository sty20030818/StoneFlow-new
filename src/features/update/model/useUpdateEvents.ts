/**
 * 更新事件监听 Hook。
 *
 * 监听统一 `update-phase`，hydrate 会话，并按 checkMode 分流。
 */

import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { toast } from 'sonner'

import {
	cancelUpdateDownload,
	checkUpdate,
	downloadAndInstall,
	getUpdateSession,
	getUpdateSettings,
	restartAndInstall,
	UPDATE_EVENTS,
	type UpdatePhasePayload,
	type UpdateSettings,
} from '@/features/update/api/updates'
import { applyUpdatePhaseEvent } from '@/features/update/model/applyUpdatePhase'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'

function storePhaseActions() {
	const store = useUpdateStore.getState()
	return {
		checkMode: store.checkMode,
		downloadUiAbandoned: store.downloadUiAbandoned,
		showUpdate: store.showUpdate,
		setStatus: store.setStatus as (status: {
			status: 'downloading' | 'error'
			downloaded?: number
			total?: number | null
			message?: string
		}) => void,
		markReady: store.markReady,
		ensureUpdateInfo: (version: string) => {
			const s = useUpdateStore.getState()
			if (!s.updateInfo || s.updateInfo.version !== version) {
				s.showUpdate(
					{
						version,
						body: s.updateInfo?.body ?? null,
						pubDate: s.updateInfo?.pubDate ?? null,
					},
					{ openDialog: false },
				)
			}
		},
		shouldToastReady: (version: string) =>
			useUpdateStore.getState().readyToastVersion !== version,
		markReadyToasted: (version: string) => {
			useUpdateStore.setState({ readyToastVersion: version })
		},
	}
}

function runPhaseEffect(effect: ReturnType<typeof applyUpdatePhaseEvent>) {
	if (!effect) return
	if (effect.type === 'toast-ready') {
		toast.success(`新版本 ${effect.version} 已下载完成，重启后生效`)
	} else if (effect.type === 'toast-error') {
		toast.error(`更新失败: ${effect.message}`)
	}
}

function handlePhasePayload(payload: UpdatePhasePayload) {
	const effect = applyUpdatePhaseEvent(payload, storePhaseActions())
	runPhaseEffect(effect)
}

export function useUpdateEvents() {
	useEffect(() => {
		let disposed = false
		let unlistenPhase: (() => void) | undefined

		async function setupListeners() {
			try {
				const settings = await getUpdateSettings()
				if (!disposed) {
					useUpdateStore.getState().setCheckMode(settings.checkMode)
				}
			} catch (err) {
				console.error('Failed to load update settings for event routing:', err)
			}

			try {
				const session = await getUpdateSession()
				if (!disposed) {
					useUpdateStore.getState().hydrateFromSession({
						phase: session.phase,
						version: session.version,
						downloaded: session.downloaded,
						total: session.total,
					})
				}
			} catch (err) {
				console.error('Failed to hydrate update session:', err)
			}

			unlistenPhase = await listen<UpdatePhasePayload>(UPDATE_EVENTS.PHASE, (event) => {
				if (disposed) return
				handlePhasePayload(event.payload)
			})
		}

		void setupListeners().catch((err) => {
			console.error('Failed to setup update event listeners:', err)
		})

		return () => {
			disposed = true
			unlistenPhase?.()
		}
	}, [])
}

/**
 * 触发下载更新的 action hook。
 */
export function useUpdateActions() {
	const setStatus = useUpdateStore((s) => s.setStatus)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const closeDialog = useUpdateStore((s) => s.closeDialog)

	async function startDownload() {
		useUpdateStore.setState({ downloadUiAbandoned: false })
		setStatus({ status: 'downloading', downloaded: 0, total: null })

		try {
			await downloadAndInstall((status) => {
				if (
					useUpdateStore.getState().downloadUiAbandoned &&
					status.status === 'downloading'
				) {
					return
				}
				setStatus(status)
			})
		} catch (err) {
			if (useUpdateStore.getState().downloadUiAbandoned) return
			const message = err instanceof Error ? err.message : '下载更新失败'
			setStatus({ status: 'error', message })
		}
	}

	/** 取消下载 UI + 请求后端停止进度推送（无法保证中断网络） */
	async function cancelDownloadUi() {
		useUpdateStore.getState().abandonDownloadUi()
		try {
			await cancelUpdateDownload()
		} catch (err) {
			console.error('Failed to suppress update progress emits:', err)
		}
	}

	async function restart() {
		try {
			await restartAndInstall()
		} catch (err) {
			console.error('Failed to restart:', err)
		}
	}

	async function checkNow(): Promise<UpdateSettings | null> {
		try {
			const settings = await getUpdateSettings()
			useUpdateStore.getState().setCheckMode(settings.checkMode)
			setStatus({ status: 'checking' })
			const info = await checkUpdate(true)
			if (info) {
				useUpdateStore.getState().showUpdate(info, { openDialog: true })
			} else {
				setStatus({ status: 'upToDate' })
				toast.success('当前已是最新版本')
			}
			return settings
		} catch (err) {
			const message = err instanceof Error ? err.message : '检查更新失败'
			setStatus({ status: 'error', message })
			toast.error(message)
			return null
		}
	}

	return { startDownload, restart, checkNow, cancelDownloadUi, closeDialog, updateInfo }
}
