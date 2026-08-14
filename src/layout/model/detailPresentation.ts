import type { DetailPresentation } from '@/features/settings'

const ASIDE_WIDTH_MIN = 400
const ASIDE_WIDTH_MAX = 560
const ASIDE_WIDTH_RATIO = 0.34
const DETAIL_SEPARATOR_WIDTH = 1
const MAIN_COLLECTION_WIDTH_MIN = 640

export type DetailPresentationInput = {
	detailPresentation: DetailPresentation
	panelWidth: number
	isCompact: boolean
}

export type ResolvedDetailPresentation = {
	effectivePresentation: DetailPresentation
	asideWidth: number
}

/** 只根据 ShellMain 实际可用宽度派生呈现方式，不修改用户偏好。 */
export function resolveDetailPresentation({
	detailPresentation,
	panelWidth,
	isCompact,
}: DetailPresentationInput): ResolvedDetailPresentation {
	const measuredPanelWidth = Number.isFinite(panelWidth) ? Math.max(0, panelWidth) : 0
	const asideWidth = Math.min(
		ASIDE_WIDTH_MAX,
		Math.max(ASIDE_WIDTH_MIN, measuredPanelWidth * ASIDE_WIDTH_RATIO),
	)
	const hasMainCollectionRoom =
		measuredPanelWidth > 0 &&
		measuredPanelWidth - asideWidth - DETAIL_SEPARATOR_WIDTH >= MAIN_COLLECTION_WIDTH_MIN

	return {
		effectivePresentation:
			isCompact || detailPresentation === 'sheet' || !hasMainCollectionRoom ? 'sheet' : 'aside',
		asideWidth,
	}
}
