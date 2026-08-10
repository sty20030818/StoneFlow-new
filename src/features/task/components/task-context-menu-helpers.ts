import { getTaskPlacementTargetValue, type TaskPlacementTarget } from '@/features/metadata-fields'

export type PropertyOptionIndicator = 'checked' | 'mixed' | null

export function getIndicatorValues<T>(values: T[]) {
	return new Set(values)
}

export function getPropertyOptionIndicator<T>(values: Set<T>, value: T): PropertyOptionIndicator {
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
