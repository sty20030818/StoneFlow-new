import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
	archiveTask,
	createTask,
	deleteTask,
	restoreTask,
	updateTask,
} from '@/features/task/api/tasks'
import { createTaskLink, deleteTaskLink, updateTaskLink } from '@/features/task/api/taskLinks'
import { emitEvent } from '@/shared/events'
import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'

import { taskKeys } from './task.keys'

function useInvalidateTaskMutation() {
	const queryClient = useQueryClient()

	return async (taskId?: string) => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: taskKeys.all }),
			taskId
				? queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
				: Promise.resolve(),
			invalidateWorkspaceQueries(queryClient, { exclude: ['tasks'] }),
		])
	}
}

export function useCreateTaskMutation() {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: createTask,
		onSuccess: async (task) => {
			emitEvent({ type: 'task:created', payload: { taskId: task.id } })
			await invalidate(task.id)
		},
	})
}

export function useUpdateTaskMutation() {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: updateTask,
		onSuccess: async (task) => {
			emitEvent({ type: 'task:updated', payload: { taskId: task.id } })
			await invalidate(task.id)
		},
	})
}

export function useArchiveTaskMutation() {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: archiveTask,
		onSuccess: async (task) => {
			emitEvent({ type: 'task:updated', payload: { taskId: task.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'task', entityId: task.id, operation: 'archive' },
			})
			await invalidate(task.id)
		},
	})
}

export function useRestoreTaskMutation() {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: restoreTask,
		onSuccess: async (task) => {
			emitEvent({ type: 'task:updated', payload: { taskId: task.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'task', entityId: task.id, operation: 'restore' },
			})
			await invalidate(task.id)
		},
	})
}

export function useDeleteTaskMutation() {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: deleteTask,
		onSuccess: async (task) => {
			emitEvent({ type: 'task:deleted', payload: { taskId: task.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'task', entityId: task.id, operation: 'delete' },
			})
			await invalidate(task.id)
		},
	})
}

export function useCreateTaskLinkMutation(taskId: string) {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: createTaskLink,
		onSuccess: async () => invalidate(taskId),
	})
}

export function useUpdateTaskLinkMutation(taskId: string) {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: updateTaskLink,
		onSuccess: async () => invalidate(taskId),
	})
}

export function useDeleteTaskLinkMutation(taskId: string) {
	const invalidate = useInvalidateTaskMutation()

	return useMutation({
		mutationFn: deleteTaskLink,
		onSuccess: async () => invalidate(taskId),
	})
}
