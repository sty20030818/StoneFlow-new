/**
 * 更新 UI 展示纯函数（可单测）。
 */

import type { UpdateUiPhase } from './useUpdateStore'

/** 0–100；total 未知时返回 null（不确定进度） */
export function formatDownloadPercent(downloaded: number, total: number | null): string | null {
	if (total === null || total <= 0) return null
	return `${Math.min(100, Math.round((downloaded / total) * 100))}%`
}

/**
 * 进度条 / 环用的 0–100 数值。
 * - 有 total：真实百分比
 * - 无 total：固定 0（不要用 undefined 宽度，块级元素会撑成「满条」）
 */
export function downloadProgressBarValue(downloaded: number, total: number | null): number {
	if (total === null || total <= 0) return 0
	return Math.min(100, Math.max(0, Math.round((downloaded / total) * 100)))
}

/** 格式化字节数为人类可读（tabular-nums 友好） */
export function formatBytes(bytes: number): string {
	if (bytes <= 0) return '0 B'
	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
	const value = bytes / Math.pow(1024, i)
	return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`
}

/**
 * 下载进度一行文案。
 * - 有 total：`1.2 MB / 4.0 MB (30%)`
 * - 刚开始无 total：`0%`（避免「0 B 已下载」）
 * - 已有流量但无 total：`1.2 MB 已下载`
 */
export function formatDownloadBytesLine(downloaded: number, total: number | null): string {
	if (total !== null && total > 0) {
		const pct = formatDownloadPercent(downloaded, total)
		return `${formatBytes(downloaded)} / ${formatBytes(total)}${pct ? ` (${pct})` : ''}`
	}
	if (downloaded <= 0) return '0%'
	return `${formatBytes(downloaded)} 已下载`
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
			if (pct) return pct
			// 尚无 Content-Length：起手显示 0%，有字节后再显示「下载中」
			return input.downloaded <= 0 ? '0%' : '下载中'
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
			return input.version ? `v${input.version} 已就绪，点击查看` : '更新已就绪'
		case 'available':
			return input.version ? `发现新版本 ${input.version}` : '发现新版本'
		case 'error':
			return input.errorMessage ?? '更新失败'
		default:
			return ''
	}
}
