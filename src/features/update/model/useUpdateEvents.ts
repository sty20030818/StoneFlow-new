/**
 * 更新事件监听 Hook。
 *
 * 在应用启动时挂载一次，负责：
 * 1. 监听后端 emit 的全局事件
 * 2. 按 checkMode 分流（自动下载不打开发现弹窗）
 * 3. 更新 Zustand store
 */

import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { toast } from 'sonner'

import {
	checkUpdate,
	downloadAndInstall,
	getUpdateSettings,
	restartAndInstall,
	UPDATE_EVENTS,
	type UpdateAvailablePayload,
	type UpdateDownloadProgressPayload,
	type UpdateErrorPayload,
	type UpdateSettings,
} from '@/features/update/api/updates'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'

export function useUpdateEvents() {
	useEffect(() => {
		let disposed = false
		const unlisteners: Array<() => void> = []

		async function setupListeners() {
			try {
				const settings = await getUpdateSettings()
				if (!disposed) {
					useUpdateStore.getState().setCheckMode(settings.checkMode)
				}
			} catch (err) {
				console.error('Failed to load update settings for event routing:', err)
			}

			const unlistenAvailable = await listen<UpdateAvailablePayload>(
				UPDATE_EVENTS.AVAILABLE,
				(event) => {
					if (disposed) return
					const info = {
						version: event.payload.version,
						body: event.payload.body,
						pubDate: event.payload.pubDate,
					}
					const checkMode = useUpdateStore.getState().checkMode
					// 自动下载：后端不应再发 available；若仍收到则只记状态、不开窗
					if (checkMode === 'autoDownload') {
						useUpdateStore.getState().showUpdate(info, { openDialog: false })
						return
					}
					useUpdateStore.getState().showUpdate(info, { openDialog: true })
				},
			)
			unlisteners.push(unlistenAvailable)

			const unlistenProgress = await listen<UpdateDownloadProgressPayload>(
				UPDATE_EVENTS.DOWNLOAD_PROGRESS,
				(event) => {
					if (disposed) return
					const store = useUpdateStore.getState()
					if (store.downloadUiAbandoned) return
					if (!store.updateInfo || store.updateInfo.version !== event.payload.version) {
						store.showUpdate(
							{
								version: event.payload.version,
								body: store.updateInfo?.body ?? null,
								pubDate: store.updateInfo?.pubDate ?? null,
							},
							{ openDialog: false },
						)
					}
					store.setStatus({
						status: 'downloading',
						downloaded: event.payload.downloaded,
						total: event.payload.total,
					})
				},
			)
			unlisteners.push(unlistenProgress)

			const unlistenDownloaded = await listen<{ version: string }>(
				UPDATE_EVENTS.DOWNLOADED,
				(event) => {
					if (disposed) return
					const store = useUpdateStore.getState()
					store.markReady(event.payload.version)
					if (store.readyToastVersion !== event.payload.version) {
						useUpdateStore.setState({ readyToastVersion: event.payload.version })
						toast.success(`新版本 ${event.payload.version} 已下载完成，重启后生效`)
					}
				},
			)
			unlisteners.push(unlistenDownloaded)

			const unlistenError = await listen<UpdateErrorPayload>(UPDATE_EVENTS.ERROR, (event) => {
				if (disposed) return
				useUpdateStore.getState().setStatus({
					status: 'error',
					message: event.payload.message,
				})
				toast.error(`更新失败: ${event.payload.message}`)
			})
			unlisteners.push(unlistenError)
		}

		void setupListeners().catch((err) => {
			console.error('Failed to setup update event listeners:', err)
		})

		return () => {
			disposed = true
			unlisteners.forEach((u) => u())
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

	/** 开始下载更新 */
	async function startDownload() {
		useUpdateStore.setState({ downloadUiAbandoned: false })
		setStatus({ status: 'downloading', downloaded: 0, total: null })

		try {
			await downloadAndInstall((status) => {
				if (useUpdateStore.getState().downloadUiAbandoned && status.status === 'downloading') {
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

	/** 取消下载 UI（best-effort，底层可能仍在下载） */
	function cancelDownloadUi() {
		useUpdateStore.getState().abandonDownloadUi()
	}

	/** 重启并安装 */
	async function restart() {
		try {
			await restartAndInstall()
		} catch (err) {
			console.error('Failed to restart:', err)
		}
	}

	/** 手动检查更新 */
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
