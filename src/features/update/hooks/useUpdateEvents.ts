/** 更新事件监听 Hook：update-phase + session hydrate。 */

import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { toast } from 'sonner'

import {
	consumeCompletedUpdate,
	getUpdateSession,
	getUpdateSettings,
	UPDATE_EVENTS,
	type UpdatePhasePayload,
} from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'
import { handleUpdatePhasePayload } from './updatePhaseEffects'

/** 后端 STARTUP_CHECK_DELAY_SECS=3；多等一点兜底拉会话 */
const STARTUP_SESSION_REHYDRATE_MS = 4500

function hydrateSessionSnapshot(session: Awaited<ReturnType<typeof getUpdateSession>>) {
	useUpdateStore.getState().hydrateFromSession({
		phase: session.phase,
		version: session.version,
		downloaded: session.downloaded,
		total: session.total,
	})
}

/** 仅当 UI 仍空闲时用会话补全，避免覆盖用户已在进行的下载 */
function maybeHydrateIfIdle(session: Awaited<ReturnType<typeof getUpdateSession>>) {
	const phase = useUpdateStore.getState().phase
	if (
		(phase === 'idle' || phase === 'upToDate' || phase === 'checking') &&
		session.phase !== 'idle'
	) {
		hydrateSessionSnapshot(session)
	}
}

/** 订阅后端更新事件并恢复当前进程的更新会话。 */
export function useUpdateEvents(onCompletedUpdate?: (version: string) => void) {
	useEffect(() => {
		let disposed = false
		let unlistenPhase: (() => void) | undefined

		async function setupListeners() {
			// 1) 尽早挂监听，降低启动检查 emit 丢失概率
			unlistenPhase = await listen<UpdatePhasePayload>(UPDATE_EVENTS.PHASE, (event) => {
				if (disposed) return
				handleUpdatePhasePayload(event.payload)
			})

			// 2) checkMode：决定 available 是否自动弹窗
			try {
				const settings = await getUpdateSettings()
				if (!disposed) {
					useUpdateStore.getState().setCheckMode(settings.checkMode)
				}
			} catch (error) {
				console.error('Failed to load update settings for event routing:', error)
			}

			// 3) 用会话快照恢复（同进程内已发现更新 / 下载中 / 就绪）
			try {
				const session = await getUpdateSession()
				if (!disposed) {
					hydrateSessionSnapshot(session)
				}
			} catch (error) {
				console.error('Failed to hydrate update session:', error)
			}
		}

		void setupListeners().catch((error) => {
			console.error('Failed to setup update event listeners:', error)
		})

		void consumeCompletedUpdate()
			.then((version) => {
				if (!disposed && version) {
					toast.success(`已更新至 ${version}`, {
						action: { label: '查看更新内容', onClick: () => onCompletedUpdate?.(version) },
					})
				}
			})
			.catch(() => {
				// 浏览器预览和一次性确认读取失败均不影响正常启动。
			})

		// 4) 启动检查约 3s 后才跑；自 mount 起延迟再 hydrate，兜底 emit 丢失。
		// setTimeout 放在 effect 同步体，保证 cleanup 一定能 clear（避免 async 竞态漏清）。
		const rehydrateTimer = setTimeout(() => {
			if (disposed) return
			void getUpdateSession()
				.then((session) => {
					if (disposed) return
					maybeHydrateIfIdle(session)
				})
				.catch(() => {
					// 延迟 hydrate 失败可忽略
				})
		}, STARTUP_SESSION_REHYDRATE_MS)

		return () => {
			disposed = true
			unlistenPhase?.()
			clearTimeout(rehydrateTimer)
		}
	}, [onCompletedUpdate])
}
