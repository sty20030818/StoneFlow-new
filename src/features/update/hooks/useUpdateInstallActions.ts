import { cancelUpdateDownload, downloadAndInstall, restartAndInstall } from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'
import { handleUpdatePhasePayload } from './updatePhaseEffects'

/** 更新 Dialog 私有的下载、取消和重启动作。 */
export function useUpdateInstallActions() {
	async function startDownload() {
		const store = useUpdateStore.getState()
		useUpdateStore.setState({ downloadUiAbandoned: false })
		store.setDownloading({ downloaded: 0, total: null }, store.updateInfo?.version)

		try {
			await downloadAndInstall((payload) => {
				if (useUpdateStore.getState().downloadUiAbandoned && payload.phase === 'downloading') {
					return
				}
				handleUpdatePhasePayload(payload)
			})
		} catch (error) {
			if (useUpdateStore.getState().downloadUiAbandoned) return
			const message = error instanceof Error ? error.message : '下载更新失败'
			useUpdateStore.getState().setError(message)
		}
	}

	async function cancelDownloadUi() {
		useUpdateStore.getState().cancelDownloadUiLocal()
		try {
			await cancelUpdateDownload()
		} catch (error) {
			console.error('Failed to cancel update download:', error)
		}
	}

	async function restart() {
		try {
			await restartAndInstall()
		} catch (error) {
			console.error('Failed to restart:', error)
		}
	}

	return { startDownload, restart, cancelDownloadUi }
}
