import type { TaskDisplayPropertyKey } from '@/features/display-options/core'

export function resolveVisibleTaskDisplayProperties(
	properties: readonly TaskDisplayPropertyKey[],
): TaskDisplayPropertyKey[] {
	return [...properties]
}

