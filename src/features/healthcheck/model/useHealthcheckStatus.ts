import { compact } from 'es-toolkit/array'

import type { HealthcheckPayload } from '@/features/healthcheck/api/healthcheck'
import { useHealthcheckQuery } from '@/features/healthcheck/query'

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
	const segments = compact(databasePath.split(/[\\/]/))

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
			indicatorClassName: 'bg-sf-shell-online',
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
	const query = useHealthcheckQuery(tauriRuntimeAvailable)

	if (!tauriRuntimeAvailable) {
		return {
			kind: 'tauri-unavailable',
			label: 'Tauri 未连接',
			detail: '当前是浏览器预览环境',
			indicatorClassName: 'bg-slate-400',
		} satisfies HealthcheckStatus
	}

	if (query.isError) {
		return {
			kind: 'error',
			label: '健康检查失败',
			detail: '无法读取 Rust 宿主状态',
			indicatorClassName: 'bg-red-400',
		} satisfies HealthcheckStatus
	}

	if (!query.data) {
		return {
			kind: 'loading',
			label: '正在检查本地连接',
			detail: '等待 Rust 宿主响应',
			indicatorClassName: 'bg-amber-400',
		} satisfies HealthcheckStatus
	}

	return resolveReadyState(query.data)
}
