import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
	deleteLifecycleEntry,
	permanentlyDeleteLifecycleEntry,
	restoreLifecycleEntry,
} from '../api/lifecycle'
import { emitEvent } from '@/shared/events'
import type { LifecycleEntry, LifecycleEntityType } from '@/shared/types'
import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'

import { lifecycleKeys } from './lifecycle.keys'

function emitEntityEvent(type: LifecycleEntityType, entityId: string, deleted = false) {
	if (type === 'space') {
		emitEvent({
			type: deleted ? 'space:deleted' : 'space:updated',
			payload: { spaceId: entityId },
		})
	} else if (type === 'project') {
		emitEvent({
			type: deleted ? 'project:deleted' : 'project:updated',
			payload: { projectId: entityId },
		})
	} else {
		emitEvent({
			type: deleted ? 'task:deleted' : 'task:updated',
			payload: { taskId: entityId },
		})
	}

	emitEvent({
		type: 'lifecycle:changed',
		payload: { entityType: type, entityId },
	})
}

function useInvalidateLifecycleMutation() {
	const queryClient = useQueryClient()

	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: lifecycleKeys.all }),
			invalidateWorkspaceQueries(queryClient, { exclude: ['lifecycle'] }),
		])
	}
}

export function useRestoreLifecycleEntryMutation() {
	const invalidate = useInvalidateLifecycleMutation()

	return useMutation({
		mutationFn: restoreLifecycleEntry,
		onSuccess: async (_result, entry: LifecycleEntry) => {
			emitEntityEvent(entry.entityType, entry.id)
			await invalidate()
		},
	})
}

export function useDeleteLifecycleEntryMutation() {
	const invalidate = useInvalidateLifecycleMutation()

	return useMutation({
		mutationFn: deleteLifecycleEntry,
		onSuccess: async (_result, entry: LifecycleEntry) => {
			emitEntityEvent(entry.entityType, entry.id, true)
			await invalidate()
		},
	})
}

export function usePermanentlyDeleteLifecycleEntryMutation() {
	const invalidate = useInvalidateLifecycleMutation()

	return useMutation({
		mutationFn: permanentlyDeleteLifecycleEntry,
		onSuccess: async (_result, entry: LifecycleEntry) => {
			emitEntityEvent(entry.entityType, entry.id, true)
			await invalidate()
		},
	})
}
