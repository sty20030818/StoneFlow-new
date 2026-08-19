import { toast } from '@heroui/react'

import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { checkUpdate } from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'

/** 菜单、设置页和关于窗口共享的用户主动检查入口。 */
export function useManualUpdateCheck() {
	const isChecking = useUpdateStore((state) => state.manualCheckPending)
	const disabled = useUpdateStore(
		(state) => state.manualCheckPending || state.snapshot?.phase === 'installing',
	)

	async function checkNow() {
		const store = useUpdateStore.getState()
		if (store.manualCheckPending || store.snapshot?.phase === 'installing') return

		// 第一个 await 前占位，防止多个入口在同一事件循环重复检查。
		store.setManualCheckPending(true)
		try {
			const result = await checkUpdate()
			store.applySnapshot(result.snapshot)
			if (result.status === 'failed') throw new Error(result.message)

			const responseIsCurrent =
				useUpdateStore.getState().snapshot?.revision === result.snapshot.revision

			if (responseIsCurrent && result.noUpdate) {
				store.setNoUpdate(true)
				toast.success('当前已是最新版本')
			} else if (responseIsCurrent && result.snapshot.update) {
				store.openDialog()
			}
		} catch (error) {
			toast.danger(normalizeTauriError(error, '检查更新失败'))
		} finally {
			store.setManualCheckPending(false)
		}
	}

	return { checkNow, disabled, isChecking }
}
