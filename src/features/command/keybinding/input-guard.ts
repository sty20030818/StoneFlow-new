import type { NormalizedKeyEvent } from './keybinding.types'

export function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	if (target.isContentEditable) {
		return true
	}

	const tagName = target.tagName
	return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

export function shouldIgnoreKeybindingEvent(event: NormalizedKeyEvent, allowInEditable = false) {
	if (event.defaultPrevented || event.isComposing) {
		return true
	}

	return !allowInEditable && isEditableTarget(event.target)
}
