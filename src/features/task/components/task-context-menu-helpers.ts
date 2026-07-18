import {
	getTaskPlacementTargetValue,
	normalizeMetadataDateValue,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'

export type PropertyOptionIndicator = 'checked' | 'mixed' | null

export const TASK_CONTEXT_SHORTCUTS = {
	status: 'S',
	priority: 'P',
	date: 'D',
	project: '⇧ P',
	archive: 'A',
} as const

export function getIndicatorValues<T>(values: T[]) {
	return new Set(values)
}

export function getPropertyOptionIndicator<T>(
	values: Set<T>,
	value: T,
): PropertyOptionIndicator {
	if (!values.has(value)) {
		return null
	}
	return values.size === 1 ? 'checked' : 'mixed'
}

export function getPlacementOptionIndicator(
	values: Set<string>,
	target: TaskPlacementTarget,
): PropertyOptionIndicator {
	const value = getTaskPlacementTargetValue(target)
	if (!values.has(value)) {
		return null
	}

	return values.size === 1 ? 'checked' : 'mixed'
}

export function normalizeDateValue(value: string | null | undefined) {
	return normalizeMetadataDateValue(value)
}

function isApplePlatform() {
	if (typeof navigator === 'undefined') {
		return false
	}
	return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function getDeleteShortcutLabel() {
	return isApplePlatform() ? '⌘ ⌫' : 'Ctrl ⌫'
}
