import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
	archiveProject,
	completeProject,
	createProject,
	deleteProject,
	reopenProject,
	restoreProject,
	updateProject,
} from '@/features/project/api/projects'
import { emitEvent } from '@/shared/events'
import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'

import { projectKeys } from './project.keys'

function useInvalidateProjectMutation() {
	const queryClient = useQueryClient()

	return async (projectId?: string) => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: projectKeys.all }),
			projectId
				? queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
				: Promise.resolve(),
			invalidateWorkspaceQueries(queryClient, { exclude: ['projects'] }),
		])
	}
}

export function useCreateProjectMutation() {
	const invalidate = useInvalidateProjectMutation()

	return useMutation({
		mutationFn: createProject,
		onSuccess: async (project) => {
			emitEvent({ type: 'project:created', payload: { projectId: project.id } })
			await invalidate(project.id)
		},
	})
}

export function useUpdateProjectMutation() {
	const invalidate = useInvalidateProjectMutation()

	return useMutation({
		mutationFn: updateProject,
		onSuccess: async (project) => {
			emitEvent({ type: 'project:updated', payload: { projectId: project.id } })
			await invalidate(project.id)
		},
	})
}

export function useCompleteProjectMutation() {
	const invalidate = useInvalidateProjectMutation()

	return useMutation({
		mutationFn: completeProject,
		onSuccess: async (project) => {
			emitEvent({ type: 'project:updated', payload: { projectId: project.id } })
			await invalidate(project.id)
		},
	})
}

export function useReopenProjectMutation() {
	const invalidate = useInvalidateProjectMutation()

	return useMutation({
		mutationFn: reopenProject,
		onSuccess: async (project) => {
			emitEvent({ type: 'project:updated', payload: { projectId: project.id } })
			await invalidate(project.id)
		},
	})
}

export function useArchiveProjectMutation() {
	const invalidate = useInvalidateProjectMutation()

	return useMutation({
		mutationFn: archiveProject,
		onSuccess: async (project) => {
			emitEvent({ type: 'project:updated', payload: { projectId: project.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'project', entityId: project.id, operation: 'archive' },
			})
			await invalidate(project.id)
		},
	})
}

export function useRestoreProjectMutation() {
	const invalidate = useInvalidateProjectMutation()

	return useMutation({
		mutationFn: restoreProject,
		onSuccess: async (project) => {
			emitEvent({ type: 'project:updated', payload: { projectId: project.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'project', entityId: project.id, operation: 'restore' },
			})
			await invalidate(project.id)
		},
	})
}

export function useDeleteProjectMutation() {
	const invalidate = useInvalidateProjectMutation()

	return useMutation({
		mutationFn: deleteProject,
		onSuccess: async (project) => {
			emitEvent({ type: 'project:deleted', payload: { projectId: project.id } })
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'project', entityId: project.id, operation: 'delete' },
			})
			await invalidate(project.id)
		},
	})
}
