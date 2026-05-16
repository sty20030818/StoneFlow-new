import { useEffect } from 'react'

type UseTaskSelectionEscapeOptions = {
	hasSelection: boolean
	clearSelection: () => void
}

const HIGHER_LAYER_SELECTOR =
	'[cmdk-root], [data-slot="dialog-content"], [data-slot="dropdown-menu-content"], [data-slot="context-menu-content"], [data-slot="select-content"], [data-slot="popover-content"], [data-slot="sheet-content"], [data-shell-drawer-root="true"]'

/**
 * 任务列表选择态的 Esc 语义：仅在没有更高层弹层、且焦点不在输入态时清空选择。
 */
export function useTaskSelectionEscape({
	hasSelection,
	clearSelection,
}: UseTaskSelectionEscapeOptions) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') {
				return
			}
			if (event.defaultPrevented || !hasSelection) {
				return
			}
			if (isEditableTarget(event.target) || isBlockedByHigherLayer()) {
				return
			}

			event.preventDefault()
			clearSelection()
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [clearSelection, hasSelection])
}

function isBlockedByHigherLayer() {
	return Boolean(document.querySelector(HIGHER_LAYER_SELECTOR))
}

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	return (
		target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	)
}
