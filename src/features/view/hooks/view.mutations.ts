import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createView, deleteView, updateView } from '../api/views'

import { viewKeys } from './view.keys'

function useInvalidateViewMutation() {
	const queryClient = useQueryClient()

	return () => queryClient.invalidateQueries({ queryKey: viewKeys.all })
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
