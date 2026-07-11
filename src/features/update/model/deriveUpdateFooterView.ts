/**
 * Footer 更新区 view model：进度 / 文案派生，UI 只渲染。
 */

import {
	downloadProgressBarValue,
	footerUpdateLabel,
	footerUpdateTitle,
	formatDownloadPercent,
} from '@/features/update/model/updatePresentation'
import type { UpdateUiPhase } from '@/features/update/model/useUpdateStore'

export type UpdateFooterVisiblePhase = Extract<
	UpdateUiPhase,
	'available' | 'downloading' | 'ready' | 'error'
>

export type UpdateFooterView = {
	phase: UpdateFooterVisiblePhase
	version: string | null
	label: string
	title: string
	downloaded: number
	total: number | null
	/** 0–100；null = indeterminate */
	ringValue: number | null
	/** 与 phase 同形，供进度环使用 */
	ringState: UpdateFooterVisiblePhase
	errorMessage: string | null
}

export type UpdateFooterViewInput = {
	phase: UpdateUiPhase
	version: string | null
	downloaded: number
	total: number | null
	errorMessage: string | null
}

export function isUpdateFooterVisiblePhase(
	phase: UpdateUiPhase,
): phase is UpdateFooterVisiblePhase {
	return (
		phase === 'available' ||
		phase === 'downloading' ||
		phase === 'ready' ||
		phase === 'error'
	)
}

export function deriveUpdateFooterView(input: UpdateFooterViewInput): UpdateFooterView | null {
	if (!isUpdateFooterVisiblePhase(input.phase)) return null

	const hasTotal = input.total !== null && input.total > 0
	// 有 total → 真实百分比；无 total 起手 → 0（空环）；无 total 已有流量 → null（慢旋）
	const ringValue =
		input.phase === 'downloading'
			? hasTotal
				? downloadProgressBarValue(input.downloaded, input.total)
				: input.downloaded <= 0
					? 0
					: null
			: input.phase === 'ready'
				? 100
				: formatDownloadPercent(input.downloaded, input.total) !== null
					? downloadProgressBarValue(input.downloaded, input.total)
					: null

	return {
		phase: input.phase,
		version: input.version,
		label: footerUpdateLabel({
			phase: input.phase,
			version: input.version,
			downloaded: input.downloaded,
			total: input.total,
			errorMessage: input.errorMessage,
		}),
		title: footerUpdateTitle({
			phase: input.phase,
			version: input.version,
			errorMessage: input.errorMessage,
		}),
		downloaded: input.downloaded,
		total: input.total,
		ringValue,
		ringState: input.phase,
		errorMessage: input.errorMessage,
	}
}
