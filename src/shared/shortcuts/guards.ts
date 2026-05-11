function isEditableElement(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	if (target.isContentEditable) {
		return true
	}

	const tagName = target.tagName
	return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

export function shouldIgnoreShortcutEvent(event: KeyboardEvent) {
	if (event.defaultPrevented || event.isComposing) {
		return true
	}

	return isEditableElement(event.target)
}
