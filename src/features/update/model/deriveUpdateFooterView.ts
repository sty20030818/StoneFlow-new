/**
 * Footer 更新区 view model：进度 / 文案派生，UI 只渲染。
 */

import {
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

	const percent = formatDownloadPercent(input.downloaded, input.total)
	const ringValue =
		percent !== null
			? Math.min(100, Math.round((input.downloaded / (input.total ?? 1)) * 100))
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
