/**
 * 更新事件监听 Hook：update-phase + session hydrate。
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
		showAvailable: store.showAvailable,
		setDownloading: store.setDownloading,
		setReady: store.setReady,
		setError: store.setError,
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

export function useUpdateActions() {
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const closeDialog = useUpdateStore((s) => s.closeDialog)

	async function startDownload() {
		const store = useUpdateStore.getState()
		useUpdateStore.setState({ downloadUiAbandoned: false })
		store.setDownloading({ downloaded: 0, total: null }, store.updateInfo?.version)

		try {
			await downloadAndInstall((payload) => {
				if (useUpdateStore.getState().downloadUiAbandoned && payload.phase === 'downloading') {
					return
				}
				handlePhasePayload(payload)
			})
		} catch (err) {
			if (useUpdateStore.getState().downloadUiAbandoned) return
			const message = err instanceof Error ? err.message : '下载更新失败'
			useUpdateStore.getState().setError(message)
		}
	}

	async function cancelDownloadUi() {
		useUpdateStore.getState().cancelDownloadUiLocal()
		try {
			await cancelUpdateDownload()
		} catch (err) {
			console.error('Failed to cancel update download:', err)
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
			const store = useUpdateStore.getState()
			store.setCheckMode(settings.checkMode)
			store.setChecking()
			const info = await checkUpdate(true)
			if (info) {
				store.showAvailable(info, { openDialog: true })
			} else {
				store.setUpToDate()
				toast.success('当前已是最新版本')
			}
			return settings
		} catch (err) {
			const message = err instanceof Error ? err.message : '检查更新失败'
			useUpdateStore.getState().setError(message)
			toast.error(message)
			return null
		}
	}

	return { startDownload, restart, checkNow, cancelDownloadUi, closeDialog, updateInfo }
}
