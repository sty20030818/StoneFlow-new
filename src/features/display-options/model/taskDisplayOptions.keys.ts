import type { TaskDisplayPageKey } from '@/features/display-options/core'

export const taskDisplayOptionsKeys = {
	all: ['display-options', 'task'] as const,
	preferences: () => [...taskDisplayOptionsKeys.all, 'preferences'] as const,
	preference: (pageKey: TaskDisplayPageKey) =>
		[...taskDisplayOptionsKeys.preferences(), pageKey] as const,
}

