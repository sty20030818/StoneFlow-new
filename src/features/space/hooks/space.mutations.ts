import { useMutation, useQueryClient } from '@tanstack/react-query'

import { archiveSpace, createSpace, deleteSpace, setDefaultSpace, updateSpace } from '../api/spaces'
import { emitEvent } from '@/shared/events'

import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'
import { spaceKeys } from './space.keys'

function useInvalidateSpaceMutation() {
	const queryClient = useQueryClient()

	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: spaceKeys.all }),
			invalidateWorkspaceQueries(queryClient, { exclude: ['spaces'] }),
		])
	}
}

export function useCreateSpaceMutation() {
	const invalidate = useInvalidateSpaceMutation()

	return useMutation({
		mutationFn: createSpace,
		onSuccess: async (space) => {
			emitEvent({ type: 'space:created', payload: { spaceId: space.id } })
			await invalidate()
		},
	})
}

export function useUpdateSpaceMutation() {
	const invalidate = useInvalidateSpaceMutation()

	return useMutation({
		mutationFn: updateSpace,
		onSuccess: async (space) => {
			emitEvent({ type: 'space:updated', payload: { spaceId: space.id } })
			await invalidate()
		},
	})
}

export function useSetDefaultSpaceMutation() {
	const invalidate = useInvalidateSpaceMutation()

	return useMutation({
		mutationFn: setDefaultSpace,
		onSuccess: async (space) => {
			emitEvent({ type: 'space:updated', payload: { spaceId: space.id } })
			await invalidate()
		},
	})
}

export function useArchiveSpaceMutation() {
	const invalidate = useInvalidateSpaceMutation()

	return useMutation({
		mutationFn: archiveSpace,
		onSuccess: async (space) => {
			emitEvent({ type: 'space:updated', payload: { spaceId: space.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'space', entityId: space.id },
			})
			await invalidate()
		},
	})
}

export function useDeleteSpaceMutation() {
	const invalidate = useInvalidateSpaceMutation()

	return useMutation({
		mutationFn: deleteSpace,
		onSuccess: async (space) => {
			emitEvent({ type: 'space:deleted', payload: { spaceId: space.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'space', entityId: space.id },
			})
			await invalidate()
		},
	})
}
