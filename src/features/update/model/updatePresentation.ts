/**
 * 更新 UI 展示纯函数（可单测）。
 */

import type { UpdateUiPhase } from '@/features/update/model/useUpdateStore'

export function formatDownloadPercent(
	downloaded: number,
	total: number | null,
): string | null {
	if (total === null || total <= 0) return null
	return `${Math.min(100, Math.round((downloaded / total) * 100))}%`
}

export function footerUpdateLabel(input: {
	phase: UpdateUiPhase
	version: string | null
	downloaded: number
	total: number | null
	errorMessage: string | null
}): string {
	switch (input.phase) {
		case 'downloading': {
			const pct = formatDownloadPercent(input.downloaded, input.total)
			return pct ?? '下载中'
		}
		case 'ready':
			return input.version ? `v${input.version} 就绪` : '更新就绪'
		case 'available':
			return '有更新'
		case 'error':
			return '更新失败'
		default:
			return ''
	}
}

export function footerUpdateTitle(input: {
	phase: UpdateUiPhase
	version: string | null
	errorMessage: string | null
}): string {
	switch (input.phase) {
		case 'downloading':
			return input.version ? `正在下载 ${input.version}` : '正在下载更新'
		case 'ready':
			return input.version ? `v${input.version} 已就绪，点击重启` : '更新已就绪'
		case 'available':
			return input.version ? `发现新版本 ${input.version}` : '发现新版本'
		case 'error':
			return input.errorMessage ?? '更新失败'
		default:
			return ''
	}
}
