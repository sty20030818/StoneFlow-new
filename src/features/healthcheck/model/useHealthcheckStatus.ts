import { useEffect, useState } from 'react'

import { type HealthcheckPayload, fetchHealthcheck } from '@/features/healthcheck/api/healthcheck'

type HealthcheckStatus =
	| {
			kind: 'loading'
			label: string
			detail: string
			indicatorClassName: string
			title?: string
	  }
	| {
			kind: 'ready'
			label: string
			detail: string
			indicatorClassName: string
			title: string
	  }
	| {
			kind: 'tauri-unavailable'
			label: string
			detail: string
			indicatorClassName: string
			title?: string
	  }
	| {
			kind: 'error'
			label: string
			detail: string
			indicatorClassName: string
			title?: string
	  }

function isTauriRuntimeAvailable() {
	const tauriWindow = window as Window & {
		__TAURI_INTERNALS__?: unknown
		__TAURI__?: unknown
	}

	return Boolean(tauriWindow.__TAURI_INTERNALS__ || tauriWindow.__TAURI__)
}

function formatDatabasePath(databasePath: string) {
	const segments = databasePath.split(/[\\/]/).filter(Boolean)

	if (segments.length <= 3) {
		return databasePath
	}

	return `...\\${segments.slice(-3).join('\\')}`
}

function resolveReadyState(payload: HealthcheckPayload): HealthcheckStatus {
	const detail = formatDatabasePath(payload.databasePath)

	if (payload.databaseReady) {
		return {
			kind: 'ready',
			label: '本地数据库已连接',
			detail,
			indicatorClassName: 'bg-(--sf-color-shell-online)',
			title: payload.databasePath,
		}
	}

	return {
		kind: 'error',
		label: '数据库未就绪',
		detail,
		indicatorClassName: 'bg-amber-400',
		title: payload.databasePath,
	}
}

/**
 * 为 Footer 提供最小健康检查状态，完成 M1-E 的前后端闭环。
 */
export function useHealthcheckStatus() {
	const tauriRuntimeAvailable = isTauriRuntimeAvailable()

	const [status, setStatus] = useState<HealthcheckStatus>(() =>
		tauriRuntimeAvailable
			? {
					kind: 'loading',
					label: '正在检查本地连接',
					detail: '等待 Rust 宿主响应',
					indicatorClassName: 'bg-amber-400',
				}
			: {
					kind: 'tauri-unavailable',
					label: 'Tauri 未连接',
					detail: '当前是浏览器预览环境',
					indicatorClassName: 'bg-slate-400',
				},
	)

	useEffect(() => {
		if (!tauriRuntimeAvailable) {
			return
		}

		let cancelled = false

		void (async () => {
			try {
				const payload = await fetchHealthcheck()

				if (!cancelled) {
					setStatus(resolveReadyState(payload))
				}
			} catch {
				if (!cancelled) {
					// 这里统一收口为可读失败态，避免把底层异常直接泄漏到壳层文案。
					setStatus({
						kind: 'error',
						label: '健康检查失败',
						detail: '无法读取 Rust 宿主状态',
						indicatorClassName: 'bg-red-400',
					})
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [tauriRuntimeAvailable])

	return status
}
