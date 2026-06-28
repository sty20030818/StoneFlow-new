import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
	updateTaskDisplayPreference,
	type UpdateTaskDisplayPreferenceInput,
} from '@/features/display-options/api/displayOptions'

import { taskDisplayOptionsKeys } from './taskDisplayOptions.keys'

export function useUpdateTaskDisplayPreferenceMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: updateTaskDisplayPreference,
		onSuccess: async (_payload, input: UpdateTaskDisplayPreferenceInput) => {
			await queryClient.invalidateQueries({
				queryKey: taskDisplayOptionsKeys.preference(input.pageKey),
			})
		},
	})
}

