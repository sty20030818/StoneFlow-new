export type QuickCreateLayoutMeasurements = {
	contentHeight?: number
	composerHeight?: number
	toastHeight?: number
	createRowHeight?: number
	taskBoardHeight?: number
	projectBoardHeight?: number
	footerHeight?: number
	surfaceOffsetHeight?: number
	surfaceClientHeight?: number
}

export const QUICK_CREATE_SHADOW_PADDING_PX = 36

export type QuickCreateLayoutMeasureResult = {
	contentHeight: number
	regionHeight: number
	surfaceChromeHeight: number
	shadowSafeAreaHeight: number
	targetHeight: number
}

/**
 * Quick Create 的窗口高度以完整内容流为真相源，并保留分区求和作为校验。
 * 这样 footer 文案换行、Board 内部 padding/gap、collapsible 几何变化都不会被漏算。
 */
export function measureQuickCreateTargetHeight(measurements: QuickCreateLayoutMeasurements) {
	return measureQuickCreateLayout(measurements).targetHeight
}

export function measureQuickCreateLayout(
	measurements: QuickCreateLayoutMeasurements,
): QuickCreateLayoutMeasureResult {
	const surfaceChromeHeight = Math.max(
		0,
		(measurements.surfaceOffsetHeight ?? 0) - (measurements.surfaceClientHeight ?? 0),
	)

	const regionHeight =
		(measurements.composerHeight ?? 0) +
		(measurements.toastHeight ?? 0) +
		(measurements.createRowHeight ?? 0) +
		(measurements.taskBoardHeight ?? 0) +
		(measurements.projectBoardHeight ?? 0) +
		(measurements.footerHeight ?? 0)
	const contentHeight = measurements.contentHeight ?? 0

	return {
		contentHeight,
		regionHeight,
		surfaceChromeHeight,
		shadowSafeAreaHeight: QUICK_CREATE_SHADOW_PADDING_PX * 2,
		targetHeight: Math.ceil(
			Math.max(regionHeight, contentHeight) +
				surfaceChromeHeight +
				QUICK_CREATE_SHADOW_PADDING_PX * 2,
		),
	}
}
