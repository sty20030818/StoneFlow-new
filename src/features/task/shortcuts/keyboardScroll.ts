import type { KeyboardNavigationDirection } from './types'

const MAIN_CARD_SCROLL_SELECTOR =
	'[data-scroll-container="true"][data-scroll-container-role="main-card"]'
const KEYBOARD_SCROLL_BEHAVIOR: ScrollBehavior = 'auto'
const BOTTOM_GAP_PX = 8
const SECTION_HEADER_GAP_PX = 2

function getOffsetTop(element: HTMLElement, ancestor: HTMLElement) {
	const elementRect = element.getBoundingClientRect()
	const ancestorRect = ancestor.getBoundingClientRect()
	return elementRect.top - ancestorRect.top + ancestor.scrollTop
}

/**
 * 键盘上下移动时，把目标行滚进主卡片可视区（含跨 section header 补偿）。
 */
export function scrollKeyboardTargetIntoView({
	taskId,
	direction,
	fromTaskId = null,
}: {
	taskId: string | null
	direction: KeyboardNavigationDirection
	fromTaskId?: string | null
}) {
	if (!taskId || typeof document === 'undefined') {
		return
	}

	const row = document.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`)
	if (!row) {
		return
	}

	const scrollContainer = row.closest<HTMLElement>(MAIN_CARD_SCROLL_SELECTOR)
	if (!scrollContainer) {
		return
	}

	const rowRect = row.getBoundingClientRect()
	const section = row.closest<HTMLElement>('[data-board-section="true"]')
	const boardRoot = row.closest<HTMLElement>('[data-board-root="true"]')
	const currentSection = section instanceof HTMLElement ? section : null
	const currentSectionHeader =
		currentSection?.querySelector<HTMLElement>('[data-board-section-header="true"]') ?? null
	const currentSectionRows = currentSection
		? Array.from(currentSection.querySelectorAll<HTMLElement>('[data-task-id]'))
		: []
	const firstRowInSection = currentSectionRows[0] ?? null
	const lastRowInSection = currentSectionRows[currentSectionRows.length - 1] ?? null
	const fromRow = fromTaskId
		? document.querySelector<HTMLElement>(`[data-task-id="${fromTaskId}"]`)
		: null
	const fromSection = fromRow?.closest<HTMLElement>('[data-board-section="true"]') ?? null
	const fromSectionHeader =
		fromSection?.querySelector<HTMLElement>('[data-board-section-header="true"]') ?? null
	const visibleTop = scrollContainer.scrollTop
	const visibleBottom = visibleTop + scrollContainer.clientHeight
	const rowTop = getOffsetTop(row, scrollContainer)
	const rowBottom = rowTop + rowRect.height
	const currentHeaderTop = currentSectionHeader
		? getOffsetTop(currentSectionHeader, scrollContainer)
		: rowTop
	const currentHeaderHeight = currentSectionHeader?.getBoundingClientRect().height ?? 0
	const firstRowTop = firstRowInSection ? getOffsetTop(firstRowInSection, scrollContainer) : rowTop
	const headerGap = firstRowInSection
		? Math.max(0, firstRowTop - (currentHeaderTop + currentHeaderHeight))
		: 0
	const sectionHeaderGap = Math.max(SECTION_HEADER_GAP_PX, headerGap)
	const safeTop = visibleTop + currentHeaderHeight + sectionHeaderGap
	const safeBottom = visibleBottom - BOTTOM_GAP_PX
	const boardBottom = boardRoot
		? boardRoot === scrollContainer
			? Math.max(scrollContainer.scrollHeight, rowBottom + BOTTOM_GAP_PX)
			: getOffsetTop(boardRoot, scrollContainer) +
				Math.max(boardRoot.scrollHeight, boardRoot.getBoundingClientRect().height)
		: rowBottom + BOTTOM_GAP_PX

	if (direction < 0) {
		let delta = 0
		const didCrossSection = !!currentSection && currentSection !== fromSection

		if (didCrossSection) {
			const previewRow = lastRowInSection ?? row
			const previewRowTop = getOffsetTop(previewRow, scrollContainer)
			const previewSafeOffset = currentHeaderHeight + sectionHeaderGap
			const fromHeaderTop = fromSectionHeader
				? getOffsetTop(fromSectionHeader, scrollContainer)
				: Number.POSITIVE_INFINITY
			const desiredScrollTop = Math.max(
				0,
				Math.min(previewRowTop - previewSafeOffset, fromHeaderTop - 1),
			)

			if (desiredScrollTop < visibleTop) {
				delta = desiredScrollTop - visibleTop
			}
		} else if (rowTop < safeTop) {
			delta = rowTop - safeTop
		}

		if (delta !== 0) {
			scrollContainer.scrollTo({
				top: Math.max(0, scrollContainer.scrollTop + delta),
				behavior: KEYBOARD_SCROLL_BEHAVIOR,
			})
		}
		return
	}

	const rows = boardRoot
		? Array.from(boardRoot.querySelectorAll<HTMLElement>('[data-task-id]'))
		: []
	const isLastRow = rows[rows.length - 1] === row
	const targetBottom = isLastRow ? boardBottom : rowBottom

	if (targetBottom > (isLastRow ? visibleBottom : safeBottom)) {
		scrollContainer.scrollTo({
			top:
				targetBottom -
				(isLastRow ? scrollContainer.clientHeight : scrollContainer.clientHeight - BOTTOM_GAP_PX),
			behavior: KEYBOARD_SCROLL_BEHAVIOR,
		})
	}
}
