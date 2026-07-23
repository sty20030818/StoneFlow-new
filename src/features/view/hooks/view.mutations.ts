import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createView, deleteView, updateView } from '../api/views'
import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'

import { viewKeys } from './view.keys'

function useInvalidateViewMutation() {
	const queryClient = useQueryClient()

	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: viewKeys.all }),
			invalidateWorkspaceQueries(queryClient, { exclude: ['views'] }),
		])
	}
}

export function useCreateViewMutation() {
	const invalidate = useInvalidateViewMutation()

	return useMutation({
		mutationFn: createView,
		onSuccess: invalidate,
	})
}

export function useUpdateViewMutation() {
	const invalidate = useInvalidateViewMutation()

	return useMutation({
		mutationFn: updateView,
		onSuccess: invalidate,
	})
}

export function useDeleteViewMutation() {
	const invalidate = useInvalidateViewMutation()

	return useMutation({
		mutationFn: deleteView,
		onSuccess: invalidate,
	})
}
