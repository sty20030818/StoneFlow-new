import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
	createView,
	deleteView,
	reorderViews,
	toggleViewVisible,
	updateView,
} from '@/features/view/api/views'
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

export function useToggleViewVisibleMutation() {
	const invalidate = useInvalidateViewMutation()

	return useMutation({
		mutationFn: ({ viewId, visible }: { viewId: string; visible: boolean }) =>
			toggleViewVisible(viewId, visible),
		onSuccess: invalidate,
	})
}

export function useReorderViewsMutation() {
	const invalidate = useInvalidateViewMutation()

	return useMutation({
		mutationFn: reorderViews,
		onSuccess: invalidate,
	})
}
