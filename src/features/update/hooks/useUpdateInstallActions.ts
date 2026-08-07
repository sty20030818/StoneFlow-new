import { toast } from 'sonner'

import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import {
	cancelUpdateDownload,
	downloadUpdate,
	installStagedUpdate,
	type UpdateChannel,
	type UpdateLifecycleResult,
} from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'

function applyLifecycleResult(result: UpdateLifecycleResult) {
	useUpdateStore.getState().applySnapshot(result.snapshot)
	if (result.status !== 'ok') throw new Error(result.message)
}

/** 更新 Dialog 私有的下载、取消和安装动作。 */
export function useUpdateInstallActions() {
	async function startDownload() {
		const snapshot = useUpdateStore.getState().snapshot
		if (snapshot?.phase !== 'available' || !snapshot.update) return

		try {
			applyLifecycleResult(await downloadUpdate(snapshot.update.version, snapshot.update.channel))
		} catch (error) {
			toast.error(normalizeTauriError(error, '下载更新失败'))
		}
	}

	async function cancelDownload() {
		if (useUpdateStore.getState().snapshot?.phase !== 'downloading') return
		try {
			const snapshot = await cancelUpdateDownload()
			useUpdateStore.getState().applySnapshot(snapshot)
			useUpdateStore.getState().closeDialog()
		} catch (error) {
			toast.error(normalizeTauriError(error, '取消下载失败'))
		}
	}

	async function install(confirmedSourceChannel: UpdateChannel | null) {
		const snapshot = useUpdateStore.getState().snapshot
		if (snapshot?.phase !== 'ready' || !snapshot.update) return

		try {
			applyLifecycleResult(
				await installStagedUpdate(snapshot.update.version, confirmedSourceChannel),
			)
		} catch (error) {
			toast.error(normalizeTauriError(error, '安装更新失败'))
		}
	}

	return { startDownload, install, cancelDownload }
}
