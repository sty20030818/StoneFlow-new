import { toast } from 'sonner'

import { checkUpdate, getUpdateSettings } from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'

/**
 * 用户主动检查更新的唯一入口。
 *
 * 菜单、设置页和关于窗口共享 update store 的 checking 相位，禁止各自维护重复请求状态。
 */
export function useManualUpdateCheck() {
	const isChecking = useUpdateStore((state) => state.phase === 'checking')

	async function checkNow() {
		const store = useUpdateStore.getState()
		if (store.phase === 'checking') return

		// 必须在第一个 await 前写入，避免两个入口在同一事件循环内重复发起请求。
		store.setChecking()

		try {
			const settings = await getUpdateSettings()
			store.setCheckMode(settings.checkMode)
			const info = await checkUpdate(true)
			if (info) {
				store.showAvailable(info, { openDialog: true })
				return
			}

			store.setUpToDate()
			toast.success('当前已是最新版本')
		} catch (error) {
			const message = error instanceof Error ? error.message : '检查更新失败'
			store.setError(message)
			toast.error(message)
		}
	}

	return { checkNow, isChecking }
}
