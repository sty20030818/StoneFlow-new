import { toast } from 'sonner'

import type { UpdatePhasePayload } from '../api/updates'
import { applyUpdatePhaseEvent } from '../model/applyUpdatePhase'
import { useUpdateStore } from '../model/useUpdateStore'

function storePhaseActions() {
	const store = useUpdateStore.getState()
	return {
		checkMode: store.checkMode,
		downloadUiAbandoned: store.downloadUiAbandoned,
		showAvailable: store.showAvailable,
		setDownloading: store.setDownloading,
		setReady: store.setReady,
		setError: store.setError,
		shouldToastReady: (version: string) => useUpdateStore.getState().readyToastVersion !== version,
		markReadyToasted: (version: string) => {
			useUpdateStore.setState({ readyToastVersion: version })
		},
	}
}

/** 将更新 phase 事件落到单轨 store，并执行对应的用户提示。 */
export function handleUpdatePhasePayload(payload: UpdatePhasePayload) {
	const effect = applyUpdatePhaseEvent(payload, storePhaseActions())
	if (!effect) return
	if (effect.type === 'toast-ready') {
		toast.success(`新版本 ${effect.version} 已下载完成，重启后生效`)
	} else if (effect.type === 'toast-error') {
		toast.error(`更新失败: ${effect.message}`)
	}
}
