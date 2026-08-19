/** 更新事件监听：先订阅唯一 snapshot 事件，再 hydrate 当前会话。 */

import { useEffect } from 'react'
import { toast } from '@heroui/react'
import { isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

import {
	consumeCompletedUpdate,
	getUpdateSettings,
	getUpdateSession,
	UPDATE_SESSION_CHANGED_EVENT,
	type UpdateChannel,
	type UpdateSessionSnapshot,
} from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'

/** 订阅后端更新事件并恢复当前进程的更新会话。 */
export function useUpdateEvents(
	onCompletedUpdate?: (version: string, channel: UpdateChannel) => void,
) {
	useEffect(() => {
		if (!isTauri()) return

		let disposed = false
		let unlisten: (() => void) | undefined
		let listenerRetryTimer: ReturnType<typeof setTimeout> | undefined
		let hydrateRetryTimer: ReturnType<typeof setTimeout> | undefined
		let listenerFailureLogged = false
		let hydrateFailureLogged = false

		async function applySnapshot(snapshot: UpdateSessionSnapshot) {
			const store = useUpdateStore.getState()
			const previousPhase = store.snapshot?.phase
			if (!store.applySnapshot(snapshot) || snapshot.phase !== 'available') return
			if (
				previousPhase !== undefined &&
				previousPhase !== 'idle' &&
				previousPhase !== 'available'
			) {
				return
			}

			try {
				const settings = await getUpdateSettings()
				const current = useUpdateStore.getState()
				if (
					!disposed &&
					settings.checkMode === 'notifyOnly' &&
					current.snapshot?.revision === snapshot.revision &&
					current.snapshot.phase === 'available'
				) {
					current.openDialogFromSnapshot(snapshot.revision)
				}
			} catch {
				// 设置读取失败时仍保留权威 snapshot，不猜测是否应弹窗。
			}
		}

		async function hydrate() {
			const snapshot = await getUpdateSession()
			if (!disposed) await applySnapshot(snapshot)
		}

		async function hydrateWithRetry() {
			try {
				await hydrate()
			} catch (error) {
				if (!hydrateFailureLogged) {
					hydrateFailureLogged = true
					console.error('Failed to hydrate update session:', error)
				}
				if (!disposed) hydrateRetryTimer = setTimeout(() => void hydrateWithRetry(), 1000)
			}
		}

		async function subscribeThenHydrate() {
			let release: () => void
			try {
				release = await listen<UpdateSessionSnapshot>(UPDATE_SESSION_CHANGED_EVENT, (event) => {
					if (!disposed) void applySnapshot(event.payload)
				})
			} catch (error) {
				if (!listenerFailureLogged) {
					listenerFailureLogged = true
					console.error('Failed to setup update session listener:', error)
				}
				void hydrate().catch((hydrateError) => {
					if (!hydrateFailureLogged) {
						hydrateFailureLogged = true
						console.error('Failed to hydrate update session:', hydrateError)
					}
				})
				if (!disposed) {
					listenerRetryTimer = setTimeout(() => void subscribeThenHydrate(), 1000)
				}
				return
			}

			if (disposed) {
				release()
				return
			}
			unlisten = release
			await hydrateWithRetry()
		}

		void subscribeThenHydrate()

		void consumeCompletedUpdate()
			.then((version) => {
				if (!disposed && version) {
					toast.success(`已更新至 ${version}`, {
						actionProps: {
							children: '查看更新内容',
							onPress: () =>
								onCompletedUpdate?.(version, version.includes('-beta.') ? 'beta' : 'stable'),
						},
					})
				}
			})
			.catch(() => {
				// 浏览器预览和一次性确认读取失败均不影响正常启动。
			})

		return () => {
			disposed = true
			if (listenerRetryTimer) clearTimeout(listenerRetryTimer)
			if (hydrateRetryTimer) clearTimeout(hydrateRetryTimer)
			unlisten?.()
		}
	}, [onCompletedUpdate])
}
