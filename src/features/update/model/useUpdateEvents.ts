/**
 * 更新事件监听 Hook。
 *
 * 在应用启动时挂载一次，负责：
 * 1. 监听后端 emit 的全局事件（update-available, update-download-progress 等）
 * 2. 自动更新 Zustand store 状态
 * 3. 自动下载模式下协调下载流程
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
} from '@/features/update/api/updates'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import type { UpdateSettings, UpdateStatus } from '@/features/update/api/updates'

export function useUpdateEvents() {
	const showUpdate = useUpdateStore((s) => s.showUpdate)
	const setStatus = useUpdateStore((s) => s.setStatus)

	useEffect(() => {
		let disposed = false
		const unlisteners: Array<() => void> = []

		async function setupListeners() {
			// 监听"有可用更新"事件
			const unlistenAvailable = await listen<UpdateAvailablePayload>(
				UPDATE_EVENTS.AVAILABLE,
				(event) => {
					if (disposed) return
					showUpdate({
						version: event.payload.version,
						body: event.payload.body,
						pubDate: event.payload.pubDate,
					})
				},
			)
			unlisteners.push(unlistenAvailable)

			// 监听下载进度事件（自动下载模式）
			const unlistenProgress = await listen<UpdateDownloadProgressPayload>(
				UPDATE_EVENTS.DOWNLOAD_PROGRESS,
				(event) => {
					if (disposed) return
					const status: UpdateStatus = {
						status: 'downloading',
						downloaded: event.payload.downloaded,
						total: event.payload.total,
					}
					setStatus(status)
				},
			)
			unlisteners.push(unlistenProgress)

			// 监听下载完成事件
			const unlistenDownloaded = await listen<{ version: string }>(
				UPDATE_EVENTS.DOWNLOADED,
				(event) => {
					if (disposed) return
					setStatus({ status: 'downloaded', version: event.payload.version })
					toast.success(`新版本 ${event.payload.version} 已下载完成，重启后生效`)
				},
			)
			unlisteners.push(unlistenDownloaded)

			// 监听错误事件
			const unlistenError = await listen<UpdateErrorPayload>(UPDATE_EVENTS.ERROR, (event) => {
				if (disposed) return
				setStatus({ status: 'error', message: event.payload.message })
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
	}, [showUpdate, setStatus])
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
		setStatus({ status: 'downloading', downloaded: 0, total: null })

		try {
			await downloadAndInstall((status) => {
				setStatus(status)
			})
			// 下载完成后，downloadAndInstall 的 onStatus 回调会收到 downloaded 状态
		} catch (err) {
			const message = err instanceof Error ? err.message : '下载更新失败'
			setStatus({ status: 'error', message })
		}
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
			setStatus({ status: 'checking' })
			const info = await checkUpdate(true)
			if (info) {
				showUpdateInStore(info)
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

	return { startDownload, restart, checkNow, closeDialog, updateInfo }
}

// 辅助函数：避免循环依赖
function showUpdateInStore(info: { version: string; body: string | null; pubDate: string | null }) {
	useUpdateStore.getState().showUpdate({
		version: info.version,
		body: info.body,
		pubDate: info.pubDate,
	})
}
