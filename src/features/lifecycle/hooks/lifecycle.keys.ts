import type { LifecycleEntityType, ListLifecycleEntriesInput, Scope } from '@/shared/types'

export const lifecycleKeys = {
	all: ['lifecycle'] as const,
	lists: () => [...lifecycleKeys.all, 'list'] as const,
	list: (
		mode: ListLifecycleEntriesInput['mode'],
		scope: Scope,
		entityFilter?: LifecycleEntityType,
	) => [...lifecycleKeys.lists(), mode, scope, entityFilter ?? null] as const,
}
