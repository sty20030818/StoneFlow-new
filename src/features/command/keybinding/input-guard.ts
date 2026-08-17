import type { NormalizedKeyEvent } from './keybinding.types'

export function isEditableTarget(target: EventTarget | null) {
	if (typeof HTMLElement === 'undefined') {
		return false
	}

	if (!(target instanceof HTMLElement)) {
		return false
	}

	if (target.isContentEditable) {
		return true
	}

	const contentEditableHost = target.closest<HTMLElement>('[contenteditable]')
	if (contentEditableHost && contentEditableHost.getAttribute('contenteditable') !== 'false') {
		return true
	}

	return target.closest('input, textarea, select, [role="textbox"], [data-editor]') !== null
}

export function shouldIgnoreKeybindingEvent(event: NormalizedKeyEvent, allowInEditable = false) {
	if (event.defaultPrevented || event.isComposing) {
		return true
	}

	return !allowInEditable && isEditableTarget(event.target)
}
