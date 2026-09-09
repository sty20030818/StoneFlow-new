import { useCallback, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'

import {
	getSyncStatus,
	runSync,
	type SyncStatus,
	type SyncStatusPayload,
} from '@/features/sync/api/sync'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'

const SYNC_STATUS_CHANGED_EVENT = 'stoneflow://sync/status-changed'
const SYNC_STATUS_REFRESH_INTERVAL_MS = 60_000

export function useSyncStatusController() {
	const [statusPayload, setStatusPayload] = useState<SyncStatusPayload | null>(null)
	const [loading, setLoading] = useState(true)
	const [running, setRunning] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	const readStatus = useCallback(
		() =>
			getSyncStatus()
				.then(setStatusPayload)
				.catch((error: unknown) => {
					setStatusPayload(null)
					setMessage(normalizeTauriError(error, '同步状态读取失败'))
				}),
		[],
	)

	const refresh = useCallback(
		async (options?: { silent?: boolean }) => {
			const silent = options?.silent ?? false
			if (!silent) {
				setLoading(true)
				setMessage(null)
			}
			try {
				await readStatus()
			} finally {
				if (!silent) setLoading(false)
			}
		},
		[readStatus],
	)

	const runNow = useCallback(async () => {
		setRunning(true)
		setMessage(null)

		try {
			await runSync()
			await refresh({ silent: true })
		} catch (error) {
			setMessage(normalizeTauriError(error, '手动同步失败'))
			await refresh({ silent: true })
		} finally {
			setRunning(false)
		}
	}, [refresh])

	useEffect(() => {
		void readStatus().finally(() => setLoading(false))
	}, [readStatus])

	useEffect(() => {
		let disposed = false
		let unlisten: (() => void) | null = null

		void listen(SYNC_STATUS_CHANGED_EVENT, () => {
			void refresh({ silent: true })
		})
			.then((nextUnlisten) => {
				if (disposed) {
					nextUnlisten()
					return
				}
				unlisten = nextUnlisten
			})
			.catch((error) => {
				console.error('sync status listener failed', { error })
			})

		return () => {
			disposed = true
			unlisten?.()
		}
	}, [refresh])

	useEffect(() => {
		if (!statusPayload?.hasRemoteConfig) {
			return
		}

		const timer = window.setInterval(() => {
			void refresh({ silent: true })
		}, SYNC_STATUS_REFRESH_INTERVAL_MS)

		return () => {
			window.clearInterval(timer)
		}
	}, [refresh, statusPayload?.hasRemoteConfig])

	const displayedStatus: SyncStatus = running
		? 'syncing'
		: (statusPayload?.status ?? (loading ? 'syncing' : 'disabled'))

	return {
		displayedStatus,
		loading,
		message,
		refresh,
		runNow,
		running,
		statusPayload,
	}
}
